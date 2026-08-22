# VPS Bridge — Local Dev with Traefik

## Quick Start
```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d
```

## Local Endpoints
| Endpoint | URL |
|---|---|
| Health | http://api.localhost/health |
| Console stream | http://api.localhost/console/stream |
| Traefik dashboard | http://localhost:8080 |

## Production Endpoints (VPS)
| Endpoint | URL |
|---|---|
| Health | https://api.aivory.id/health |
| Console stream | https://api.aivory.id/console/stream |

## Host Gateway
| Environment | ZEROCLAW_URL |
|---|---|
| Mac/Windows local | http://host.docker.internal:3010 |
| Linux local | http://172.17.0.1:3010 |
| VPS production | http://172.17.0.1:3010 |

## Stop
```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml down