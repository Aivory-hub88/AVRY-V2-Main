use axum::{
    body::Bytes,
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path, State,
    },
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::get,
    Router,
};
use dashmap::DashMap;
use futures::{sink::SinkExt, stream::StreamExt};
use sqlx::Row;
use std::{net::SocketAddr, sync::Arc, time::Duration};
use tokio::sync::{broadcast, mpsc};
use tracing::{info, warn};
use yrs::{updates::decoder::Decode, Doc, ReadTxn, StateVector, Transact, Update};

type RoomId = String;

#[derive(Clone)]
struct Room {
    doc: Arc<Doc>,
    tx: broadcast::Sender<Vec<u8>>,
    flush_tx: mpsc::UnboundedSender<()>,
}

#[derive(Clone)]
struct AppState {
    rooms: Arc<DashMap<RoomId, Room>>,
    pg: Option<sqlx::postgres::PgPool>,
}

/// Load a Yjs update (V1) from OctoBase pg store and apply it into `doc`.
async fn octobase_load(pg: &sqlx::postgres::PgPool, key: &str, doc: &Doc) -> Option<usize> {
    let row = sqlx::query("SELECT yjs_update FROM dashboard.workspace_docs WHERE id = $1")
        .bind(key)
        .fetch_optional(pg)
        .await
        .ok()??;
    let bytes: Vec<u8> = row.try_get("yjs_update").ok()?;
    if bytes.is_empty() {
        return None;
    }
    let n = bytes.len();
    if let Ok(update) = Update::decode_v1(&bytes) {
        let mut txn = doc.transact_mut();
        txn.apply_update(update);
        Some(n)
    } else {
        None
    }
}

/// Debounced flush task per room: on trigger, wait out the window, then
/// encode the full doc state and upsert into OctoBase pg store.
async fn flush_task(state: AppState, room_id: RoomId, doc: Arc<Doc>, mut rx: mpsc::UnboundedReceiver<()>) {
    loop {
        if rx.recv().await.is_none() {
            break; // room dropped
        }
        // debounce window — collapse bursts of edits into one flush
        tokio::time::sleep(Duration::from_millis(300)).await;
        while rx.try_recv().is_ok() {}
        let Some(pg) = state.pg.clone() else { continue };
        // yrs Transaction is !Send — scope it so no borrow crosses the await below
        let upd = {
            let txn = doc.transact();
            txn.encode_state_as_update_v1(&StateVector::default())
        };
        if upd.len() <= 2 {
            continue; // empty doc, nothing to persist
        }
        match sqlx::query(
            "INSERT INTO dashboard.workspace_docs (id, yjs_update, updated_at)
             VALUES ($1, $2, now())
             ON CONFLICT (id) DO UPDATE SET yjs_update = EXCLUDED.yjs_update, updated_at = now()",
        )
        .bind(&room_id)
        .bind(upd)
        .execute(&pg)
        .await
        {
            Ok(_) => {}
            Err(e) => warn!(room=%room_id, "OctoBase flush failed: {}", e),
        }
    }
}

impl AppState {
    /// Get or create a room, lazily loading its state from the OctoBase pg
    /// store on first access. Rooms are keyed by their full room id
    /// (`workspace:{docId}`, `workspace:db:{docId}`). On first-ever access it
    /// also merges the legacy dashboard BYTEA row (keyed by bare docId) —
    /// that is the built-in yjs→OctoBase migration.
    async fn ensure_room(self, room_id: &str) -> Room {
        if let Some(r) = self.rooms.get(room_id) {
            return r.clone();
        }
        let doc = Arc::new(Doc::new());
        if let Some(pg) = &self.pg {
            // 1) OctoBase row (room-keyed)
            if let Some(n) = octobase_load(pg, room_id, &doc).await {
                info!(room=%room_id, bytes=%n, "OctoBase lazy-load");
            }
            // 2) legacy dashboard row (bare docId) — yjs→OctoBase migration, applied once
            let legacy_id = room_id
                .trim_start_matches("workspace:")
                .trim_start_matches("db:");
            if legacy_id != room_id {
                if let Some(n) = octobase_load(pg, legacy_id, &doc).await {
                    info!(room=%room_id, legacy=%legacy_id, bytes=%n, "legacy BYTEA migrated into y-octo");
                }
            }
        }
        let (tx, _) = broadcast::channel(1024);
        let (flush_tx, flush_rx) = mpsc::unbounded_channel();
        let room = Room { doc: doc.clone(), tx, flush_tx };
        self.rooms.insert(room_id.to_string(), room.clone());
        let st = self.clone();
        let rid = room_id.to_string();
        tokio::spawn(flush_task(st, rid, doc, flush_rx));
        room
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
        "store": "OctoBase pg-backed (dashboard.workspace_docs, lazy-load + debounce flush)",
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
    let room = state.clone().ensure_room(&room_id).await;
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
    let room = state.clone().ensure_room(&room_id).await;
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
        let _ = room.flush_tx.send(()); // OctoBase persist (debounced)
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
    let room_obj = state.clone().ensure_room(&room).await;
    let doc = room_obj.doc.clone();
    let tx = room_obj.tx.clone();
    let flush = room_obj.flush_tx.clone();
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
                            drop(txn);
                            let _ = flush.send(()); // OctoBase persist (debounced)
                        }
                    }
                    2 => {
                        if let Ok(update) = Update::decode_v1(update_bytes) {
                            let mut txn = doc.transact_mut();
                            txn.apply_update(update);
                            drop(txn);
                            let mut fwd = Vec::with_capacity(2 + update_bytes.len() + 8);
                            fwd.push(0);
                            fwd.push(2);
                            encode_var_uint(update_bytes.len(), &mut fwd);
                            fwd.extend_from_slice(update_bytes);
                            let _ = tx.send(fwd);
                            let _ = flush.send(()); // OctoBase persist (debounced)
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

    let pg = match std::env::var("DATABASE_URL") {
        Ok(url) if !url.trim().is_empty() => {
            match sqlx::postgres::PgPoolOptions::new()
                .max_connections(4)
                .connect_lazy(&url)
            {
                Ok(pool) => {
                    info!("OctoBase pg store: pool ready (dashboard.workspace_docs)");
                    Some(pool)
                }
                Err(e) => {
                    warn!("DATABASE_URL invalid, in-memory only: {}", e);
                    None
                }
            }
        }
        _ => {
            warn!("DATABASE_URL unset, in-memory only (no OctoBase persist)");
            None
        }
    };

    let state = AppState {
        rooms: Arc::new(DashMap::new()),
        pg,
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
