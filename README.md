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

## Project Status

Phase 1: Design documents complete. See `docs/` for architecture, schema, API contracts, race engine rules, and Firo integration design.
