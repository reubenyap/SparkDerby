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
├── packages/shared/          # Shared types, constants, utilities
├── apps/
│   ├── api/                  # NestJS backend (PostgreSQL, Redis, WebSockets)
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── race/     # Race entities, controller, service, WS gateway
│   │       │   ├── player/   # Player identity, sessions
│   │       │   ├── firo/     # Mock Firo RPC, chain watcher, address manager
│   │       │   ├── action/   # Game actions (boost, emp, etc.)
│   │       │   ├── settlement/ # Post-race payout settlement
│   │       │   └── broadcast/  # Event broadcasting
│   │       └── database/
│   │           └── migrations/ # Full initial schema migration
│   └── web/                  # Next.js frontend (Tailwind, Zustand, Socket.IO)
│       └── src/
│           ├── app/          # Pages (home, race, history, how-to-play)
│           ├── components/   # Race track, leaderboard, actions, player
│           ├── stores/       # Zustand state management
│           ├── hooks/        # WebSocket hook
│           └── lib/          # API client, WS client
├── docker-compose.yml        # PostgreSQL + Redis + API + Web
└── docs/                     # Architecture & design documents
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

## Project Status

- Phase 1: Design documents complete. See `docs/` for architecture, schema, API contracts, race engine rules, and Firo integration design.
- Phase 2: Backend and frontend scaffolds complete. NestJS API with TypeORM entities, initial migration, mock Firo adapter, and placeholder chain watcher. Next.js frontend with race visualization, player identity, and WebSocket integration.
