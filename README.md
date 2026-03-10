# Spark Rush

A browser-based live race game built on Firo Spark transactions.

Players participate using only a Spark address or Spark Name. Every meaningful gameplay interaction — backing a racer, boosting, sabotaging — is an on-chain Firo Spark transaction. The backend recognizes valid transactions at InstantLock, enabling near-instant gameplay without waiting for block confirmations.

## Game Overview

- **2 races per day** (Race A: 00:00–12:00 UTC, Race B: 12:00–00:00 UTC)
- **6 racers per race**, each with a distinct archetype
- **24 ticks per race**, 1 tick every 30 minutes
- **Pari-mutuel payouts** based on how much FIRO you back on a racer
- **On-chain actions** (Boost, EMP, Oil Slick, Overclock, Black Swan) affect race outcomes

## Tech Stack

- **Frontend:** Next.js, TypeScript, Tailwind CSS
- **Backend:** NestJS, TypeScript
- **Database:** PostgreSQL
- **Cache/PubSub:** Redis
- **Real-time:** WebSockets
- **Blockchain:** Firo Spark (JSON-RPC)
- **Infrastructure:** Docker Compose

## Project Structure

```
SparkDerby/
├── packages/shared/          # Shared types, constants, race engine, payout calculator
├── apps/
│   ├── api/                  # NestJS backend
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── race/       # Race entities, controller, service, WS gateway
│   │       │   ├── player/     # Player identity (Spark address / Spark Name)
│   │       │   ├── firo/       # Firo adapter (mock + JSON-RPC), chain watcher,
│   │       │   │               # address manager, tx classifier, InstantLock,
│   │       │   │               # payout service, reconciliation
│   │       │   ├── action/     # Game actions (boost, emp, oil slick, overclock, black swan)
│   │       │   ├── backing/    # Racer backing tracking
│   │       │   ├── settlement/ # Pari-mutuel payout settlement engine
│   │       │   ├── broadcast/  # Event broadcasting (WebSocket + Telegram)
│   │       │   ├── telegram/   # Telegram public channel broadcast worker
│   │       │   ├── admin/      # Admin controls (settle, cancel, reconcile, watcher)
│   │       │   ├── audit/      # Audit replay log + verification endpoints
│   │       │   ├── onchain/    # On-chain event tracking
│   │       │   └── scheduler/  # Race lifecycle cron
│   │       └── database/
│   │           └── migrations/ # Full initial schema migration
│   └── web/                  # Next.js frontend (Tailwind, Zustand, Socket.IO)
│       └── src/
│           ├── app/          # Pages: home, lobby, live, results, admin, audit, how-to-play
│           ├── components/   # Race track, leaderboard, actions, player identity, QR codes
│           ├── stores/       # Zustand state management (race + player)
│           ├── hooks/        # useWebSocket
│           └── lib/          # API client, WS client, mock data
├── docker-compose.yml        # PostgreSQL + Redis + API + Web
└── docs/                     # Architecture, schema, API contracts, race engine,
                              # Firo integration, deployment guide
```

## Quick Start

```bash
# Start infrastructure
cp .env.example .env
docker compose up -d postgres redis

# Install dependencies
npm install

# Build shared package
npm run build --workspace=packages/shared

# Run database migration
npm run db:migrate

# Start development servers
npm run dev
```

See [`docs/deployment.md`](docs/deployment.md) for full production deployment instructions, Firo node setup, Telegram bot configuration, and operational notes.

## Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm test --workspace=apps/api -- --testPathPattern=settlement
npm test --workspace=apps/api -- --testPathPattern=chain-watcher
npm test --workspace=apps/api -- --testPathPattern=telegram
npm test --workspace=packages/shared
```

## Architecture

- **No accounts** — players identify with a Spark address or Spark Name
- **No browser wallets** — players send FIRO from their own wallet to game-generated addresses
- **Address-encoded intent** — each racer × action type gets a unique Spark address; sending to it is the action
- **InstantLock** — Firo's ~2s finality means near-instant gameplay
- **Deterministic engine** — race outcomes are verifiable via commit-reveal randomness
- **Pari-mutuel payouts** — backers of winning racers share the prize pool proportionally
- **Full audit trail** — every tick, action, and payout is recorded and publicly verifiable

## Project Status

All 6 phases complete:

- **Phase 1**: Design documents — architecture, schema, API contracts, race engine rules, Firo integration
- **Phase 2**: Backend + frontend scaffolds, migrations, Docker Compose, mock adapters
- **Phase 3**: Deterministic race engine, payouts, rate limits, randomness, unit tests
- **Phase 4**: Firo JSON-RPC adapter, Spark Names, InstantLock, chain watcher, tx classification
- **Phase 5**: Full frontend — landing, lobby, live race, results, admin, QR codes, action UI, live feed
- **Phase 6**: Settlement engine, admin controls, Telegram broadcast, audit/replay view, integration tests, deployment docs
