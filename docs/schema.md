# Spark Rush — Database Schema

## Overview

PostgreSQL 16. All timestamps are `TIMESTAMPTZ` (UTC). UUIDs are generated server-side via `gen_random_uuid()`. Monetary amounts use `DECIMAL(18,8)` to match Firo's 8-decimal precision. Spark addresses are stored as `VARCHAR(200)` to accommodate the 144-character mainnet format with headroom.

---

## Entity Relationship Summary

```
players ──< browser_sessions
players ──< race_participants >── racers
players ──< onchain_events
players ──< settlements
races   ──< racers
races   ──< race_participants
races   ──< onchain_events
races   ──< settlements
races   ──< broadcast_messages
races   ──< tick_snapshots
racers  ──< onchain_events
racers  ──< race_participants
racers  ──< settlements
```

---

## Tables

### players

Identified by Spark address or Spark Name. No email, no password, no passkey.

```sql
CREATE TABLE players (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_type        VARCHAR(20)  NOT NULL CHECK (identity_type IN ('spark_address', 'spark_name')),
  identity_value       VARCHAR(255) NOT NULL,
  resolved_address     VARCHAR(200) NOT NULL,
  resolution_timestamp TIMESTAMPTZ,
  created_at           TIMESTAMPTZ  DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(identity_type, identity_value)
);

CREATE INDEX idx_players_resolved_address ON players(resolved_address);
```

| Column               | Type         | Description |
|----------------------|--------------|-------------|
| id                   | UUID         | Primary key |
| identity_type        | VARCHAR(20)  | `'spark_address'` or `'spark_name'` |
| identity_value       | VARCHAR(255) | The raw value the player submitted |
| resolved_address     | VARCHAR(200) | The resolved Spark address (used for all lookups) |
| resolution_timestamp | TIMESTAMPTZ  | When the Spark Name was resolved (null if direct address) |
| created_at           | TIMESTAMPTZ  | Row creation time |
| updated_at           | TIMESTAMPTZ  | Last update time |

---

### browser_sessions

Lightweight local sessions for convenience. Not strong authentication.

```sql
CREATE TABLE browser_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id     UUID         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  expires_at    TIMESTAMPTZ  NOT NULL
);

CREATE INDEX idx_browser_sessions_player ON browser_sessions(player_id);
CREATE INDEX idx_browser_sessions_token ON browser_sessions(session_token);
```

| Column        | Type         | Description |
|---------------|--------------|-------------|
| id            | UUID         | Primary key |
| player_id     | UUID         | FK → players |
| session_token | VARCHAR(255) | Random token stored in browser |
| created_at    | TIMESTAMPTZ  | Session creation time |
| expires_at    | TIMESTAMPTZ  | Session expiry (e.g., 7 days) |

---

### races

Two races per day. Each race has a server secret for commit-reveal randomness.

```sql
CREATE TABLE races (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label              VARCHAR(10)   NOT NULL,
  race_date          DATE          NOT NULL,
  starts_at          TIMESTAMPTZ   NOT NULL,
  ends_at            TIMESTAMPTZ   NOT NULL,
  current_tick       INT           DEFAULT 0,
  status             VARCHAR(20)   DEFAULT 'pending'
                       CHECK (status IN ('pending', 'open', 'active', 'finished', 'settled')),
  server_secret      VARCHAR(128),
  server_secret_hash VARCHAR(128),
  chaos_address      VARCHAR(200),
  total_prize_pool   DECIMAL(18,8) DEFAULT 0,
  total_treasury     DECIMAL(18,8) DEFAULT 0,
  total_reserve      DECIMAL(18,8) DEFAULT 0,
  created_at         TIMESTAMPTZ   DEFAULT NOW(),
  UNIQUE(race_date, label)
);

CREATE INDEX idx_races_status ON races(status);
CREATE INDEX idx_races_starts_at ON races(starts_at);
```

| Column             | Type          | Description |
|--------------------|---------------|-------------|
| id                 | UUID          | Primary key |
| label              | VARCHAR(10)   | `'A'` (00:00–12:00 UTC) or `'B'` (12:00–00:00 UTC) |
| race_date          | DATE          | The date this race belongs to |
| starts_at          | TIMESTAMPTZ   | Race start time |
| ends_at            | TIMESTAMPTZ   | Race end time |
| current_tick       | INT           | Current tick (0–24) |
| status             | VARCHAR(20)   | `pending` → `open` → `active` → `finished` → `settled` |
| server_secret      | VARCHAR(128)  | Hex-encoded random secret (revealed post-race) |
| server_secret_hash | VARCHAR(128)  | SHA-256 hash of server_secret (published at creation) |
| chaos_address      | VARCHAR(200)  | Global Black Swan Spark receiving address |
| total_prize_pool   | DECIMAL(18,8) | Accumulated prize pool from backing (90%) + actions (45%) |
| total_treasury     | DECIMAL(18,8) | Accumulated treasury from backing (10%) + actions (35%) |
| total_reserve      | DECIMAL(18,8) | Accumulated reserve from actions (20%) |
| created_at         | TIMESTAMPTZ   | Row creation time |

**Status lifecycle:**
- `pending` — race created, addresses being generated
- `open` — addresses ready, backing accepted, race has not started ticking
- `active` — tick 1+ in progress
- `finished` — tick 24 complete, awaiting settlement
- `settled` — payouts sent, server_secret revealed

---

### racers

Six racers per race. Each has an archetype and dedicated Spark addresses for receiving actions.

```sql
CREATE TABLE racers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id           UUID          NOT NULL REFERENCES races(id) ON DELETE CASCADE,
  slot              INT           NOT NULL CHECK (slot BETWEEN 1 AND 6),
  name              VARCHAR(50)   NOT NULL,
  archetype         VARCHAR(20)   NOT NULL
                      CHECK (archetype IN ('balanced', 'sprinter', 'closer', 'tank', 'wildcard', 'technician')),
  position          DECIMAL(10,4) DEFAULT 0,
  total_backing     DECIMAL(18,8) DEFAULT 0,
  backing_address   VARCHAR(200)  NOT NULL,
  boost_address     VARCHAR(200)  NOT NULL,
  emp_address       VARCHAR(200)  NOT NULL,
  oil_slick_address VARCHAR(200)  NOT NULL,
  overclock_address VARCHAR(200)  NOT NULL,
  created_at        TIMESTAMPTZ   DEFAULT NOW(),
  UNIQUE(race_id, slot)
);

CREATE INDEX idx_racers_race ON racers(race_id);
```

| Column            | Type          | Description |
|-------------------|---------------|-------------|
| id                | UUID          | Primary key |
| race_id           | UUID          | FK → races |
| slot              | INT           | Position 1–6 in the race |
| name              | VARCHAR(50)   | Display name (e.g., "Blaze", "Shadow") |
| archetype         | VARCHAR(20)   | One of 6 archetypes |
| position          | DECIMAL(10,4) | Current position on the track (0–100) |
| total_backing     | DECIMAL(18,8) | Total FIRO backed on this racer |
| backing_address   | VARCHAR(200)  | Spark address for backing this racer |
| boost_address     | VARCHAR(200)  | Spark address for boosting this racer |
| emp_address       | VARCHAR(200)  | Spark address for EMP-ing this racer |
| oil_slick_address | VARCHAR(200)  | Spark address for Oil Slick on this racer |
| overclock_address | VARCHAR(200)  | Spark address for Overclock on this racer |
| created_at        | TIMESTAMPTZ   | Row creation time |

---

### race_participants

Snapshot of a player's participation in a race. Created when the player first backs a racer. The payout address is snapshotted at this moment and cannot change for the duration of the race.

```sql
CREATE TABLE race_participants (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id            UUID          NOT NULL REFERENCES races(id) ON DELETE CASCADE,
  player_id          UUID          NOT NULL REFERENCES players(id),
  racer_id           UUID          NOT NULL REFERENCES racers(id),
  backing_amount     DECIMAL(18,8) DEFAULT 0,
  payout_address     VARCHAR(200)  NOT NULL,
  identity_type      VARCHAR(20)   NOT NULL,
  identity_value     VARCHAR(255)  NOT NULL,
  snapshot_timestamp TIMESTAMPTZ   DEFAULT NOW(),
  UNIQUE(race_id, player_id, racer_id)
);

CREATE INDEX idx_race_participants_race ON race_participants(race_id);
CREATE INDEX idx_race_participants_player ON race_participants(player_id);
CREATE INDEX idx_race_participants_racer ON race_participants(racer_id);
```

| Column             | Type          | Description |
|--------------------|---------------|-------------|
| id                 | UUID          | Primary key |
| race_id            | UUID          | FK → races |
| player_id          | UUID          | FK → players |
| racer_id           | UUID          | FK → racers (which racer they backed) |
| backing_amount     | DECIMAL(18,8) | Total FIRO this player has backed on this racer |
| payout_address     | VARCHAR(200)  | Snapshotted Spark address for payouts |
| identity_type      | VARCHAR(20)   | Identity type at time of snapshot |
| identity_value     | VARCHAR(255)  | Identity value at time of snapshot |
| snapshot_timestamp | TIMESTAMPTZ   | When this participation was first recorded |

**Note:** A player can back multiple racers in the same race (one row per racer). The payout address is the same across all entries for the same player+race.

---

### onchain_events

Every Spark transaction detected by the Chain Watcher, whether valid or rejected.

```sql
CREATE TABLE onchain_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id             UUID          REFERENCES races(id),
  racer_id            UUID          REFERENCES racers(id),
  player_id           UUID          REFERENCES players(id),
  txid                VARCHAR(128)  NOT NULL UNIQUE,
  amount              DECIMAL(18,8) NOT NULL,
  action_type         VARCHAR(30)   NOT NULL
                        CHECK (action_type IN ('backing', 'boost', 'emp', 'oil_slick', 'overclock', 'black_swan')),
  destination_address VARCHAR(200)  NOT NULL,
  instant_locked      BOOLEAN       DEFAULT FALSE,
  applied             BOOLEAN       DEFAULT FALSE,
  applied_at_tick     INT,
  rejected_reason     VARCHAR(100),
  raw_tx              JSONB,
  detected_at         TIMESTAMPTZ   DEFAULT NOW(),
  created_at          TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_onchain_events_race ON onchain_events(race_id);
CREATE INDEX idx_onchain_events_racer ON onchain_events(racer_id);
CREATE INDEX idx_onchain_events_player ON onchain_events(player_id);
CREATE INDEX idx_onchain_events_txid ON onchain_events(txid);
CREATE INDEX idx_onchain_events_pending ON onchain_events(race_id, applied) WHERE applied = FALSE AND rejected_reason IS NULL;
```

| Column              | Type          | Description |
|---------------------|---------------|-------------|
| id                  | UUID          | Primary key |
| race_id             | UUID          | FK → races (null if unclassifiable) |
| racer_id            | UUID          | FK → racers (null for Black Swan or unclassifiable) |
| player_id           | UUID          | FK → players (null if sender unknown) |
| txid                | VARCHAR(128)  | Firo transaction ID |
| amount              | DECIMAL(18,8) | Transaction amount in FIRO |
| action_type         | VARCHAR(30)   | Classified action type |
| destination_address | VARCHAR(200)  | The Spark address the tx was sent to |
| instant_locked      | BOOLEAN       | Whether InstantLock was confirmed |
| applied             | BOOLEAN       | Whether this was applied to race logic |
| applied_at_tick     | INT           | Which tick this was applied at (null if not applied) |
| rejected_reason     | VARCHAR(100)  | Why rejected: `'late'`, `'cooldown'`, `'below_minimum'`, `'no_instantlock'`, `'race_not_active'` |
| raw_tx              | JSONB         | Full transaction data from Firo RPC |
| detected_at         | TIMESTAMPTZ   | When Chain Watcher first saw this |
| created_at          | TIMESTAMPTZ   | Row creation time |

---

### settlements

Payout records for race winners' backers.

```sql
CREATE TABLE settlements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id        UUID          NOT NULL REFERENCES races(id),
  player_id      UUID          NOT NULL REFERENCES players(id),
  racer_id       UUID          NOT NULL REFERENCES racers(id),
  place          INT           NOT NULL CHECK (place BETWEEN 1 AND 3),
  backing_amount DECIMAL(18,8) NOT NULL,
  payout_amount  DECIMAL(18,8) NOT NULL,
  payout_address VARCHAR(200)  NOT NULL,
  payout_txid    VARCHAR(128),
  status         VARCHAR(20)   DEFAULT 'pending'
                   CHECK (status IN ('pending', 'sending', 'confirmed', 'failed')),
  error_message  VARCHAR(500),
  created_at     TIMESTAMPTZ   DEFAULT NOW(),
  settled_at     TIMESTAMPTZ
);

CREATE INDEX idx_settlements_race ON settlements(race_id);
CREATE INDEX idx_settlements_player ON settlements(player_id);
CREATE INDEX idx_settlements_status ON settlements(status);
```

| Column         | Type          | Description |
|----------------|---------------|-------------|
| id             | UUID          | Primary key |
| race_id        | UUID          | FK → races |
| player_id      | UUID          | FK → players |
| racer_id       | UUID          | FK → racers (the racer they backed) |
| place          | INT           | Finishing position (1, 2, or 3) |
| backing_amount | DECIMAL(18,8) | How much this player backed |
| payout_amount  | DECIMAL(18,8) | Computed payout |
| payout_address | VARCHAR(200)  | Where to send (from race_participants snapshot) |
| payout_txid    | VARCHAR(128)  | Firo txid of the payout transaction |
| status         | VARCHAR(20)   | `pending` → `sending` → `confirmed` or `failed` |
| error_message  | VARCHAR(500)  | Error details if failed |
| created_at     | TIMESTAMPTZ   | Row creation time |
| settled_at     | TIMESTAMPTZ   | When payout was confirmed |

---

### broadcast_messages

Queue for Telegram and future broadcast channels.

```sql
CREATE TABLE broadcast_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id      UUID         REFERENCES races(id),
  channel      VARCHAR(20)  DEFAULT 'telegram',
  message_type VARCHAR(30)  NOT NULL,
  content      TEXT         NOT NULL,
  sent         BOOLEAN      DEFAULT FALSE,
  sent_at      TIMESTAMPTZ,
  error_count  INT          DEFAULT 0,
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_broadcast_unsent ON broadcast_messages(sent, created_at) WHERE sent = FALSE;
```

| Column       | Type        | Description |
|--------------|-------------|-------------|
| id           | UUID        | Primary key |
| race_id      | UUID        | FK → races (null for system messages) |
| channel      | VARCHAR(20) | `'telegram'` (extensible) |
| message_type | VARCHAR(30) | `'race_open'`, `'standings'`, `'action'`, `'chaos'`, `'podium'`, `'payout'` |
| content      | TEXT        | Formatted message text |
| sent         | BOOLEAN     | Whether successfully sent |
| sent_at      | TIMESTAMPTZ | When sent |
| error_count  | INT         | Number of failed send attempts |
| created_at   | TIMESTAMPTZ | Row creation time |

---

### tick_snapshots

Immutable audit log for every tick. Enables post-race verification with the revealed server_secret.

```sql
CREATE TABLE tick_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id         UUID         NOT NULL REFERENCES races(id) ON DELETE CASCADE,
  tick_number     INT          NOT NULL,
  randomness_seed VARCHAR(255) NOT NULL,
  public_entropy  VARCHAR(255),
  racer_positions JSONB        NOT NULL,
  actions_applied JSONB        NOT NULL,
  active_effects  JSONB,
  computed_at     TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(race_id, tick_number)
);

CREATE INDEX idx_tick_snapshots_race ON tick_snapshots(race_id);
```

| Column          | Type         | Description |
|-----------------|--------------|-------------|
| id              | UUID         | Primary key |
| race_id         | UUID         | FK → races |
| tick_number     | INT          | 1–24 |
| randomness_seed | VARCHAR(255) | The derived seed for this tick |
| public_entropy  | VARCHAR(255) | The public entropy source used (e.g., block hash) |
| racer_positions | JSONB        | `{"racer_id": position, ...}` after this tick |
| actions_applied | JSONB        | `[{"action_type", "racer_id", "player_id", "amount"}, ...]` |
| active_effects  | JSONB        | Ongoing multi-tick effects (Oil Slick, Overclock remaining ticks) |
| computed_at     | TIMESTAMPTZ  | When this tick was computed |

---

## Migration Strategy

Migrations will be managed via TypeORM migration files in Phase 2. Tables are created in dependency order:

1. `players`
2. `browser_sessions`
3. `races`
4. `racers`
5. `race_participants`
6. `onchain_events`
7. `settlements`
8. `broadcast_messages`
9. `tick_snapshots`
