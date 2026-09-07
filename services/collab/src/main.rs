use axum::{
    body::Bytes,
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path, State,
    },
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{get, put},
    Router,
};
use dashmap::DashMap;
use futures::{sink::SinkExt, stream::StreamExt};
use std::{net::SocketAddr, sync::Arc};
use tokio::sync::broadcast;
use tracing::{info, warn};
use yrs::{updates::decoder::Decode, Doc, ReadTxn, StateVector, Transact, Update};

type RoomId = String;

#[derive(Clone)]
struct Room {
    doc: Arc<Doc>,
    tx: broadcast::Sender<Vec<u8>>,
}

#[derive(Clone)]
struct AppState {
    rooms: Arc<DashMap<RoomId, Room>>,
}

impl AppState {
    fn room_for(&self, room: &str) -> Room {
        self.rooms
            .entry(room.to_string())
            .or_insert_with(|| {
                let doc = Arc::new(Doc::new());
                let (tx, _) = broadcast::channel(1024);
                Room { doc, tx }
            })
            .clone()
    }
}

async fn health() -> impl IntoResponse {
    (StatusCode::OK, "aivory-collab ok 3200 y-octo")
}

async fn info() -> impl IntoResponse {
    axum::Json(serde_json::json!({
        "service": "aivory-collab",
        "port": 3200,
        "crdt": "y-octo (yrs 0.17, yjs 13 compat)",
        "store": "OctoBase in-memory skeleton",
        "ws": "/yjs/:room — 101 y-websocket compat",
        "health": "/health",
        "api": "/api/workspace/:id/doc (GET/PUT octet-stream, X-Agent-Type)"
    }))
}

async fn http_get_doc(
    Path(id): Path<String>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let room_id = format!("workspace:{}", id);
    let room = state.room_for(&room_id);
    let txn = room.doc.transact();
    let upd = txn.encode_state_as_update_v1(&StateVector::default());
    // if doc empty, return 404 to let caller fallback to localStorage
    if upd.len() <= 2 {
        return (StatusCode::NOT_FOUND, "empty").into_response();
    }
    (
        StatusCode::OK,
        [
            (axum::http::header::CONTENT_TYPE, "application/octet-stream"),
            (axum::http::header::CACHE_CONTROL, "no-store"),
        ],
        upd,
    )
        .into_response()
}

async fn http_put_doc(
    Path(id): Path<String>,
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> impl IntoResponse {
    if body.is_empty() {
        return (StatusCode::BAD_REQUEST, "empty").into_response();
    }
    let room_id = format!("workspace:{}", id);
    let room = state.room_for(&room_id);
    let agent = headers
        .get("x-agent-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("user")
        .to_string();
    // apply update to doc
    if let Ok(update) = Update::decode_v1(&body) {
        {
            let mut txn = room.doc.transact_mut();
            txn.apply_update(update);
        }
        // broadcast as sync update to ws peers
        let mut fwd = Vec::with_capacity(2 + body.len() + 8);
        fwd.push(0);
        fwd.push(2);
        encode_var_uint(body.len(), &mut fwd);
        fwd.extend_from_slice(&body);
        let _ = room.tx.send(fwd);
        info!(id=%id, agent=%agent, bytes=%body.len(), "http PUT /api/workspace/:id/doc via y-octo");
        return (StatusCode::OK, axum::Json(serde_json::json!({ "id": id, "agent": agent, "bytes": body.len() }))).into_response();
    }
    (StatusCode::BAD_REQUEST, "invalid yjs update").into_response()
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    headers: HeaderMap,
    Path(room): Path<String>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let agent = headers
        .get("x-agent-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("user")
        .to_string();
    info!(room=%room, agent=%agent, "ws upgrade /yjs/:room");
    ws.on_upgrade(move |socket| handle_socket(socket, room, state))
}

async fn ws_handler_root(
    ws: WebSocketUpgrade,
    headers: HeaderMap,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws_handler(ws, headers, Path("default".to_string()), State(state)).await
}

fn encode_var_uint(mut n: usize, out: &mut Vec<u8>) {
    loop {
        let b = (n & 0x7f) as u8;
        n >>= 7;
        if n == 0 {
            out.push(b);
            break;
        } else {
            out.push(b | 0x80);
        }
    }
}

fn decode_var_uint(buf: &[u8]) -> (usize, usize) {
    let mut num: usize = 0;
    let mut shift = 0;
    for (i, &b) in buf.iter().enumerate() {
        num |= ((b & 0x7f) as usize) << shift;
        shift += 7;
        if b & 0x80 == 0 {
            return (num, i + 1);
        }
        if shift >= 28 {
            break;
        }
    }
    (0, 0)
}

async fn handle_socket(socket: WebSocket, room: String, state: AppState) {
    let room_obj = state.room_for(&room);
    let doc = room_obj.doc.clone();
    let tx = room_obj.tx.clone();
    let rx = tx.subscribe();

    let (ws_sender, mut ws_receiver) = socket.split();
    let (mpsc_tx, mut mpsc_rx) = tokio::sync::mpsc::unbounded_channel::<Vec<u8>>();

    // syncStep1 init
    {
        let txn = doc.transact();
        let sv = txn.state_vector();
        use yrs::updates::encoder::{Encode, Encoder, EncoderV1};
        let mut enc = EncoderV1::new();
        sv.encode(&mut enc);
        let sv_bytes = enc.to_vec();
        let mut msg = Vec::with_capacity(2 + sv_bytes.len() + 4);
        msg.push(0u8);
        msg.push(0u8);
        encode_var_uint(sv_bytes.len(), &mut msg);
        msg.extend_from_slice(&sv_bytes);
        let _ = mpsc_tx.send(msg);
    }

    let mpsc_tx_bcast = mpsc_tx.clone();
    let bcast_task = tokio::spawn(async move {
        let mut rx = rx;
        while let Ok(msg) = rx.recv().await {
            if mpsc_tx_bcast.send(msg).is_err() {
                break;
            }
        }
    });

    let mut sender = ws_sender;
    let forward_task = tokio::spawn(async move {
        while let Some(bytes) = mpsc_rx.recv().await {
            if sender.send(Message::Binary(bytes)).await.is_err() {
                break;
            }
        }
    });

    while let Some(Ok(msg)) = ws_receiver.next().await {
        let data = match msg {
            Message::Binary(b) => b,
            Message::Text(t) => t.into_bytes(),
            Message::Close(_) => break,
            _ => continue,
        };
        if data.is_empty() {
            continue;
        }
        match data[0] {
            0 => {
                if data.len() < 2 {
                    continue;
                }
                let sync_type = data[1];
                let payload = &data[2..];
                let (len, offset) = decode_var_uint(payload);
                if len == 0 && offset == 0 {
                    continue;
                }
                if payload.len() < offset + len {
                    continue;
                }
                let update_bytes = &payload[offset..offset + len];
                match sync_type {
                    0 => {
                        // syncStep1 -> syncStep2
                        let sv = match StateVector::decode_v1(update_bytes) {
                            Ok(sv) => sv,
                            Err(_) => continue,
                        };
                        let txn = doc.transact();
                        let diff = txn.encode_state_as_update_v1(&sv);
                        let mut reply = Vec::with_capacity(2 + diff.len() + 8);
                        reply.push(0);
                        reply.push(1);
                        encode_var_uint(diff.len(), &mut reply);
                        reply.extend_from_slice(&diff);
                        let _ = mpsc_tx.send(reply);
                    }
                    1 => {
                        if let Ok(update) = Update::decode_v1(update_bytes) {
                            let mut txn = doc.transact_mut();
                            txn.apply_update(update);
                        }
                    }
                    2 => {
                        if let Ok(update) = Update::decode_v1(update_bytes) {
                            let mut txn = doc.transact_mut();
                            txn.apply_update(update);
                            let mut fwd = Vec::with_capacity(2 + update_bytes.len() + 8);
                            fwd.push(0);
                            fwd.push(2);
                            encode_var_uint(update_bytes.len(), &mut fwd);
                            fwd.extend_from_slice(update_bytes);
                            let _ = tx.send(fwd);
                        }
                    }
                    _ => {}
                }
            }
            1 => {
                let _ = tx.send(data.to_vec());
            }
            _ => warn!("unknown y-protocols type {}", data[0]),
        }
    }

    forward_task.abort();
    bcast_task.abort();
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    let state = AppState {
        rooms: Arc::new(DashMap::new()),
    };

    let app = Router::new()
        .route("/health", get(health))
        .route("/info", get(info))
        .route("/yjs", get(ws_handler_root))
        .route("/yjs/", get(ws_handler_root))
        .route("/yjs/:room", get(ws_handler))
        .route("/api/workspace/:id/doc", get(http_get_doc).put(http_put_doc))
        // y-websocket compat: also handle /yjs/:room via http GET for fallback
        .route("/api/workspace/:id/doc/", get(http_get_doc).put(http_put_doc))
        .with_state(state)
        .layer(tower_http::cors::CorsLayer::permissive())
        .layer(tower_http::trace::TraceLayer::new_for_http());

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(3200);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!("aivory-collab listening on {} (y-octo yrs compat, ws /yjs/:room)", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
