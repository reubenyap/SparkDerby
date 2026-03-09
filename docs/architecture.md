# Spark Rush — Architecture

## System Overview

Spark Rush is a monorepo containing a NestJS backend and a Next.js frontend. The backend connects to a Firo full node via JSON-RPC to watch Spark transactions and send payouts. PostgreSQL stores persistent game state. Redis handles caching, pub/sub for real-time events, and rate-limit tracking. The frontend communicates with the backend over REST (initial loads) and WebSockets (live race updates).

```
┌──────────────┐       REST / WS       ┌──────────────────────────────────────┐
│              │ ◄───────────────────► │             Backend (NestJS)          │
│   Frontend   │                       │                                      │
│  (Next.js)   │                       │  ┌─────┐ ┌───────────┐ ┌──────────┐ │
│              │                       │  │ API │ │Race Engine│ │Scheduler │ │
└──────────────┘                       │  └──┬──┘ └─────┬─────┘ └────┬─────┘ │
                                       │     │          │            │        │
                                       │  ┌──▼──────────▼────────────▼─────┐  │
                                       │  │           Redis (pub/sub)      │  │
                                       │  └──┬─────────────────────┬───────┘  │
                                       │     │                     │          │
                                       │  ┌──▼──────────┐  ┌──────▼───────┐  │
                                       │  │Chain Watcher │  │  Settlement  │  │
                                       │  └──┬──────────┘  └──────┬───────┘  │
                                       │     │                     │          │
                                       │  ┌──▼─────────────────────▼───────┐  │
                                       │  │       Firo RPC Adapter         │  │
                                       │  └──┬─────────────────────────────┘  │
                                       │     │                                │
                                       └─────┼────────────────────────────────┘
                                             │  JSON-RPC
                                       ┌─────▼─────┐
                                       │ Firo Node  │
                                       │  (firod)   │
                                       └───────────┘

                      ┌────────────┐              ┌──────────┐
                      │ PostgreSQL │              │ Telegram  │
                      │            │◄─── Backend ──►│ Bot API  │
                      └────────────┘              └──────────┘
```

## Service Boundaries

### 1. API Service (`src/api/`)

**Responsibility:** HTTP REST endpoints and WebSocket gateway for frontend communication.

- Serves race state, standings, addresses, projections, results, audit logs
- Player registration (Spark address or Spark Name → session token)
- Cooldown checks
- Admin endpoints (auth via bearer token)
- WebSocket rooms per race: broadcasts tick updates, new actions, backing events, race finish

**Depends on:** Race Engine, Firo module (for Spark Name resolution), Redis (pub/sub subscriber)

### 2. Race Engine (`src/race-engine/`)

**Responsibility:** Core game logic. Deterministic tick simulation.

- Tick processing every 30 minutes (triggered by Scheduler)
- Archetype-based speed calculation
- Action effect application (boosts, debuffs, chaos)
- Diminishing returns for repeated debuffs
- Commit-reveal randomness derivation per tick
- Audit log generation (tick snapshots)

**Depends on:** PostgreSQL (racer state, onchain_events), Redis (active effects cache)

**No external dependencies.** The race engine is a pure computation module that reads pending actions from the database and writes updated positions.

### 3. Firo RPC Adapter (`src/firo/firo-rpc.service.ts`)

**Responsibility:** Thin wrapper around Firo JSON-RPC. All Firo node communication goes through this single service.

- `generateSparkAddress()` — calls `getnewsparkaddress`
- `getTransaction(txid)` — calls `gettransaction`, returns InstantLock status
- `listSparkMints()` — calls `listsparkmints`
- `spendSpark(outputs)` — calls `spendspark` for payouts
- `getSparkBalance()` — calls `getsparkbalance`
- `resolveSparkName(name)` — resolves Spark Name to address
- `getSparkCoinAddress(txHash)` — calls `getsparkcoinaddr`

**Depends on:** Firo node (network). Connection config via environment variables.

### 4. Chain Watcher (`src/firo/chain-watcher.service.ts`)

**Responsibility:** Continuously monitors for new Spark transactions directed at race addresses.

- Polls `listsparkmints` every 5 seconds
- Tracks last-seen transaction set to detect new mints
- For each new mint:
  1. Calls `gettransaction` to check `instantlock` status
  2. Looks up destination address in address mapping (race_addresses / racer addresses)
  3. Classifies into action type + target racer
  4. Validates: correct amount (±0.001 tolerance), race is active, not too late for current tick
  5. Checks rate limits via Redis (1 action/60s per identity)
  6. Inserts into `onchain_events` table
  7. For backing: updates `race_participants` and `racers.total_backing`
  8. Publishes event to Redis channel for WebSocket broadcast
- Transactions that fail validation are still recorded with `rejected_reason`

**Depends on:** Firo RPC Adapter, PostgreSQL, Redis

### 5. Address Manager (`src/firo/address-manager.service.ts`)

**Responsibility:** Generates and manages per-race Spark receiving addresses.

- Called by Scheduler when a new race is created
- Generates 31 unique Spark addresses per race:
  - 6 racers × 5 actions (backing, boost, emp, oil_slick, overclock) = 30
  - 1 global chaos address (black_swan)
- Stores address → (race_id, racer_id, action_type) mapping in `racers` table and `races.chaos_address`
- Provides lookup: given an address, return the race/racer/action it maps to

**Depends on:** Firo RPC Adapter, PostgreSQL

### 6. Settlement Engine (`src/settlement/`)

**Responsibility:** Computes and executes pari-mutuel payouts after a race finishes.

- Triggered by admin or automatically after tick 24
- Steps:
  1. Determine final podium (1st, 2nd, 3rd) by position
  2. Compute prize buckets: 1st=60%, 2nd=25%, 3rd=15% of `total_prize_pool`
  3. For each backer of a podium racer: `payout = bucket × (player_backing / total_backing_on_racer)`
  4. Create `settlements` records
  5. Send payouts via `spendspark` to each player's snapshotted `payout_address`
  6. Update settlement status as txids are confirmed
  7. Reveal `server_secret` on the race record

**Depends on:** Firo RPC Adapter, PostgreSQL

### 7. Broadcast Service (`src/broadcast/`)

**Responsibility:** Public race commentary via Telegram. Not per-user notifications.

- Listens to Redis pub/sub for race events
- Formats messages for Telegram
- Broadcasts: race open, standings updates, major actions, chaos events, podium, prize pool summary
- Queue-based: writes to `broadcast_messages` table, worker sends and marks as sent

**Depends on:** Redis (subscriber), PostgreSQL, Telegram Bot API

### 8. Scheduler (`src/scheduler/`)

**Responsibility:** Race lifecycle management via cron jobs.

- **Race creation:** Runs at 23:55 UTC and 11:55 UTC to create next race
  - Generates server_secret + hash
  - Triggers Address Manager
  - Sets status = 'open' (backing accepted before first tick)
- **Tick trigger:** Runs every 30 minutes during active race hours
  - Calls Race Engine to process tick
  - Emits tick_update via Redis
- **Race finalization:** After tick 24, sets status = 'finished'

**Depends on:** Race Engine, Address Manager, Redis

## Event Flow Between Services

### Player backs a racer
```
Player Wallet → Firo Network → Chain Watcher detects mint
  → validates amount ≥ 1 FIRO + instantlock
  → inserts onchain_event (action_type='backing')
  → updates race_participants.backing_amount
  → updates racers.total_backing
  → updates races.total_prize_pool (+90%) and races.total_treasury (+10%)
  → publishes 'new_backing' to Redis
  → API WebSocket gateway broadcasts to room
  → Broadcast Service sends Telegram message (if significant)
```

### Player sends an action (e.g., Boost)
```
Player Wallet → Firo Network → Chain Watcher detects mint
  → validates amount = 0.10 FIRO + instantlock
  → checks Redis rate limit (1 action/60s)
  → inserts onchain_event (action_type='boost', applied=false)
  → updates races financial splits (45% pool, 35% treasury, 20% reserve)
  → publishes 'new_action' to Redis
  → API broadcasts to room
  → (action applied at next tick by Race Engine)
```

### Tick processing
```
Scheduler triggers tick →
  Race Engine reads pending onchain_events where applied=false and not rejected
  → derives tick randomness (HMAC-SHA256)
  → computes per-racer movement (archetype + random + action effects)
  → applies diminishing returns for repeated debuffs
  → updates racer positions
  → marks onchain_events as applied
  → inserts tick_snapshot for audit
  → publishes 'tick_update' to Redis
  → Broadcast Service sends standings update
```

### Race settlement
```
Tick 24 completes → status = 'finished' →
  Admin triggers settlement (or auto-settle) →
  Settlement Engine computes payouts →
  Calls spendspark for each payout →
  Updates settlement records with txids →
  Reveals server_secret on race →
  Publishes 'race_finished' to Redis →
  Broadcast Service sends podium + payout summary
```

## Infrastructure

| Component   | Technology       | Purpose                              |
|-------------|-----------------|--------------------------------------|
| Database    | PostgreSQL 16    | Persistent game state, audit logs    |
| Cache       | Redis 7          | Rate limits, pub/sub, active effects |
| Backend     | NestJS + TypeORM | API, game logic, chain integration   |
| Frontend    | Next.js 14       | Player-facing UI                     |
| Blockchain  | Firo (firod)     | Spark transactions, InstantLock      |
| Messaging   | Telegram Bot API | Public race commentary               |
| Containers  | Docker Compose   | Local dev and deployment             |

## Assumptions

1. A Firo full node (`firod`) is running and accessible via JSON-RPC, with wallet unlocked for Spark operations.
2. The Firo node's wallet holds sufficient Spark balance for payouts.
3. `getnewsparkaddress` returns unique addresses suitable for tracking individual payments.
4. InstantLock is reliable and provides sufficient finality for gameplay (no double-spend risk after lock).
5. Spark Name resolution is available via the Firo node's RPC interface.
6. The system operator manages the Firo node independently — it is not containerized with the app.

## Risks

1. **Firo node availability:** If the Firo node goes down, chain watching and payouts halt. Mitigation: health check monitoring, graceful degradation (pause race actions, resume on reconnect).
2. **Address generation limits:** Generating 31 addresses per race (62/day) may have wallet performance implications over time. Mitigation: monitor wallet size, periodic key pool refresh.
3. **Transaction identification:** Spark transactions are private by design. Identifying which player sent a transaction requires the player to send from a known address or the system to use `getsparkcoinaddr`. If a transaction cannot be attributed to a player, it is recorded but may not count toward their backing.
4. **Rate limit evasion:** Players could use multiple Spark addresses to bypass rate limits. Mitigation: rate limit by resolved address; accept this is a soft limit, not a hard guarantee.
5. **Payout dust:** Very small backing amounts may result in payouts below the network fee. Mitigation: set a minimum payout threshold; accumulate dust in treasury.
