# Deployment Guide

## Prerequisites

- **Node.js** 18+ with npm 9+
- **Docker** & **Docker Compose** v2
- **Firo node** with Spark enabled (for production)
- **PostgreSQL** 15+ (included in Docker Compose)
- **Redis** 7+ (included in Docker Compose)

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=sparkderby
DATABASE_USER=sparkderby
DATABASE_PASSWORD=<strong-password>

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Firo JSON-RPC (leave empty or 'mock' for development)
FIRO_RPC_HOST=127.0.0.1
FIRO_RPC_PORT=18888
FIRO_RPC_USER=firouser
FIRO_RPC_PASSWORD=<rpc-password>
FIRO_FORCE_REAL=false

# Telegram (optional — log-only mode if not set)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHANNEL_ID=

# Server
API_PORT=3001
WEB_PORT=3000
NODE_ENV=production

# Race Config
RACE_TICK_INTERVAL_MS=1800000
CHAIN_POLL_INTERVAL_MS=5000
```

## Development Setup

```bash
# 1. Clone and install
git clone <repo-url> SparkDerby
cd SparkDerby
npm install

# 2. Start infrastructure
docker compose up -d postgres redis

# 3. Build shared package
npm run build --workspace=packages/shared

# 4. Run database migration
npm run db:migrate

# 5. Start dev servers (API + Web)
npm run dev
```

The API runs on `http://localhost:3001` and the web frontend on `http://localhost:3000`.

The mock Firo adapter is used automatically when `FIRO_RPC_HOST` is empty or set to `mock`.

## Production Deployment

### Option 1: Docker Compose (recommended for single-server)

```bash
# Build and start all services
docker compose -f docker-compose.yml up -d --build

# Run migrations
docker compose exec api npm run db:migrate
```

### Option 2: Manual

```bash
# Build all packages
npm run build --workspace=packages/shared
npm run build --workspace=apps/api
npm run build --workspace=apps/web

# Start API
cd apps/api && node dist/main.js

# Start Web (Next.js)
cd apps/web && npm start
```

### Reverse Proxy (nginx example)

```nginx
upstream api {
  server 127.0.0.1:3001;
}

upstream web {
  server 127.0.0.1:3000;
}

server {
  listen 443 ssl;
  server_name sparkrush.example.com;

  # WebSocket support
  location /socket.io/ {
    proxy_pass http://api;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
  }

  # API
  location /api/ {
    proxy_pass http://api;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  # Frontend
  location / {
    proxy_pass http://web;
    proxy_set_header Host $host;
  }
}
```

## Firo Node Setup

### Requirements

- Firo Core with Spark support enabled
- Sufficient FIRO balance for payouts
- JSON-RPC enabled with authentication

### Configuration (firo.conf)

```
server=1
rpcuser=firouser
rpcpassword=<strong-password>
rpcport=18888
rpcallowip=127.0.0.1
spark=1
txindex=1
```

### Wallet

The API uses a single hot wallet for:
- Generating per-race Spark addresses (backing + action addresses)
- Receiving player transactions
- Sending payouts, treasury, and reserve transfers

Keep the hot wallet balance limited. Use cold storage for treasury accumulation.

## Telegram Bot Setup

1. Create a bot via [@BotFather](https://t.me/BotFather)
2. Get the bot token
3. Create a public channel for race broadcasts
4. Add the bot as an admin to the channel
5. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHANNEL_ID` in `.env`

If these are not set, the Telegram service runs in log-only mode — all messages are logged but not sent.

## Operational Notes

### Race Lifecycle

- Races are created automatically by the scheduler at 00:00 and 12:00 UTC
- Each race has 24 ticks, one every 30 minutes (configurable via `RACE_TICK_INTERVAL_MS`)
- Settlement runs automatically after the final tick
- Admin can manually trigger settlement via `POST /api/admin/races/:id/settle`

### Chain Watcher

- Polls `listsparkmints` every 5 seconds (configurable via `CHAIN_POLL_INTERVAL_MS`)
- Uses Redis distributed lock to prevent duplicate processing in multi-instance deployments
- Deduplicates transactions against the database
- Checks InstantLock status before applying actions

### Settlement

- Calculates pari-mutuel payouts using the deterministic engine from `@sparkderby/shared`
- Sends payouts via batched `spendspark` calls
- Records all on-chain events for audit
- Idempotent — safe to retry if interrupted

### Monitoring

- Check system status: `GET /api/admin/status`
- View wallet balance: `GET /api/admin/wallet/balance`
- View blockchain info: `GET /api/admin/blockchain/info`
- Reconcile a race: `POST /api/admin/races/:id/reconcile`

### Rate Limits

- 1 action per 60 seconds per player identity
- 1 Black Swan per player per race
- Cooldown violations are recorded but actions are not applied

## Assumptions

1. **Single Firo node**: The system assumes a single Firo node handles all RPC calls. High availability requires external failover.
2. **Hot wallet security**: The API server has direct access to the Firo wallet. Secure the server and limit wallet balance.
3. **Clock synchronization**: Race ticks depend on server time. Use NTP to keep clocks synchronized.
4. **No account system**: Players are identified solely by Spark address or Spark Name. There are no passwords, no email, no OAuth.
5. **Public transparency**: All race data, actions, and settlements are publicly auditable via the `/audit` endpoints.
6. **Firo Spark availability**: The system requires Firo Spark to be operational. If the Firo network is down, races cannot process transactions.
7. **Single-server deployment**: Docker Compose setup assumes a single server. For multi-server, use external PostgreSQL and Redis and configure the chain watcher's distributed lock.
8. **Telegram is broadcast-only**: No per-user messaging, no interactive commands, no betting via Telegram.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Chain watcher not detecting transactions | Check Firo node connectivity, verify `listsparkmints` returns data |
| Settlement stuck in "settling" | Check for payout errors in logs, retry via admin endpoint |
| WebSocket not connecting | Verify nginx upgrade headers, check CORS settings |
| Mock adapter in production | Set `FIRO_FORCE_REAL=true` or configure a valid `FIRO_RPC_HOST` |
| Telegram messages not sending | Verify bot token and channel ID, check bot has admin rights in channel |
