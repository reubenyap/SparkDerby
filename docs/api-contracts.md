# Spark Rush — API Contracts

## Overview

The backend exposes:
- **REST API** on `/api/*` for stateless reads and player registration
- **WebSocket** on `/ws` for real-time race updates

All responses are JSON. Timestamps are ISO 8601 UTC. Monetary amounts are strings to preserve decimal precision (e.g., `"1.50000000"`).

---

## REST Endpoints

### Player Registration

#### `POST /api/players/register`

Register or retrieve a player by Spark address or Spark Name. Returns a lightweight session token.

**Request:**
```json
{
  "identity_type": "spark_address" | "spark_name",
  "identity_value": "sm1abc..." | "@playername"
}
```

**Response (200):**
```json
{
  "player_id": "uuid",
  "identity_type": "spark_name",
  "identity_value": "@playername",
  "resolved_address": "sm1abc...",
  "session_token": "random-token-string"
}
```

**Errors:**
- `400` — invalid identity format
- `502` — Spark Name resolution failed (Firo node unavailable)

**Notes:**
- If the player already exists (same identity_type + identity_value), returns the existing record with a new session token.
- If identity_type is `spark_name`, the backend resolves it to a Spark address via Firo RPC and stores both.
- No proof of wallet ownership is required.

---

### Races

#### `GET /api/races/current`

Returns the current active or open race (the one players should interact with now).

**Response (200):**
```json
{
  "race": {
    "id": "uuid",
    "label": "A",
    "race_date": "2026-03-09",
    "starts_at": "2026-03-09T00:00:00Z",
    "ends_at": "2026-03-09T12:00:00Z",
    "current_tick": 5,
    "status": "active",
    "server_secret_hash": "abc123...",
    "total_prize_pool": "45.00000000",
    "chaos_address": "sm1chaos...",
    "racers": [
      {
        "id": "uuid",
        "slot": 1,
        "name": "Blaze",
        "archetype": "sprinter",
        "position": "22.5000",
        "total_backing": "15.00000000"
      }
    ]
  }
}
```

**Errors:**
- `404` — no current race available

---

#### `GET /api/races/:id`

Full race details including racer positions and backing pools.

**Response (200):**
```json
{
  "race": {
    "id": "uuid",
    "label": "A",
    "race_date": "2026-03-09",
    "starts_at": "2026-03-09T00:00:00Z",
    "ends_at": "2026-03-09T12:00:00Z",
    "current_tick": 5,
    "status": "active",
    "server_secret_hash": "abc123...",
    "total_prize_pool": "45.00000000",
    "total_treasury": "5.00000000",
    "chaos_address": "sm1chaos...",
    "racers": [
      {
        "id": "uuid",
        "slot": 1,
        "name": "Blaze",
        "archetype": "sprinter",
        "position": "22.5000",
        "total_backing": "15.00000000",
        "backing_address": "sm1back...",
        "boost_address": "sm1boost...",
        "emp_address": "sm1emp...",
        "oil_slick_address": "sm1oil...",
        "overclock_address": "sm1over..."
      }
    ]
  }
}
```

---

#### `GET /api/races/:id/standings`

Lightweight standings for polling or display.

**Response (200):**
```json
{
  "race_id": "uuid",
  "current_tick": 5,
  "racers": [
    {
      "id": "uuid",
      "slot": 1,
      "name": "Blaze",
      "archetype": "sprinter",
      "position": "22.5000",
      "total_backing": "15.00000000"
    }
  ]
}
```

---

#### `GET /api/races/:id/addresses`

All Spark addresses for interacting with this race. Used by the frontend to display QR codes and copy-to-clipboard addresses.

**Response (200):**
```json
{
  "race_id": "uuid",
  "chaos_address": "sm1chaos...",
  "racers": [
    {
      "racer_id": "uuid",
      "name": "Blaze",
      "slot": 1,
      "addresses": {
        "backing": "sm1back...",
        "boost": "sm1boost...",
        "emp": "sm1emp...",
        "oil_slick": "sm1oil...",
        "overclock": "sm1over..."
      }
    }
  ]
}
```

---

#### `GET /api/races/:id/payouts/projection`

Projected payouts for a player given current standings. Shows what the player would receive if the race ended now.

**Query parameters:**
- `player_id` (required) — the player's UUID

**Response (200):**
```json
{
  "race_id": "uuid",
  "player_id": "uuid",
  "projections": [
    {
      "racer_id": "uuid",
      "racer_name": "Blaze",
      "current_position": 1,
      "player_backing": "5.00000000",
      "total_backing_on_racer": "15.00000000",
      "place_bucket_pct": 60,
      "estimated_payout": "9.00000000"
    }
  ]
}
```

---

#### `GET /api/races/:id/feed`

Live feed of race events (actions, backing, chaos, tick updates).

**Query parameters:**
- `since` (optional) — ISO timestamp, return events after this time
- `limit` (optional, default 50, max 200)

**Response (200):**
```json
{
  "race_id": "uuid",
  "events": [
    {
      "id": "uuid",
      "type": "action",
      "action_type": "boost",
      "racer_id": "uuid",
      "racer_name": "Blaze",
      "player_masked": "sm1...xyz",
      "amount": "0.10000000",
      "tick": 5,
      "timestamp": "2026-03-09T02:31:15Z"
    },
    {
      "id": "uuid",
      "type": "backing",
      "racer_id": "uuid",
      "racer_name": "Shadow",
      "player_masked": "sm1...abc",
      "amount": "3.00000000",
      "tick": 5,
      "timestamp": "2026-03-09T02:30:00Z"
    },
    {
      "id": "uuid",
      "type": "tick",
      "tick": 5,
      "positions": [
        { "racer_id": "uuid", "position": "22.5000" }
      ],
      "timestamp": "2026-03-09T02:30:00Z"
    }
  ]
}
```

**Note:** `player_masked` shows first 4 and last 3 characters of the Spark address for privacy.

---

#### `GET /api/races/:id/results`

Final results for a completed race. Includes revealed server secret.

**Response (200):**
```json
{
  "race_id": "uuid",
  "status": "settled",
  "server_secret": "hex-string",
  "server_secret_hash": "hex-string",
  "podium": [
    { "place": 1, "racer_id": "uuid", "racer_name": "Blaze", "position": "100.0000" },
    { "place": 2, "racer_id": "uuid", "racer_name": "Shadow", "position": "95.3200" },
    { "place": 3, "racer_id": "uuid", "racer_name": "Volt", "position": "91.1500" }
  ],
  "prize_pool": "45.00000000",
  "payouts": [
    {
      "player_id": "uuid",
      "player_masked": "sm1...xyz",
      "racer_name": "Blaze",
      "place": 1,
      "backing_amount": "5.00000000",
      "payout_amount": "9.00000000",
      "payout_txid": "firo-txid"
    }
  ]
}
```

**Errors:**
- `404` — race not found
- `409` — race not yet finished

---

#### `GET /api/races/:id/audit`

Full tick-by-tick audit log for independent verification.

**Response (200):**
```json
{
  "race_id": "uuid",
  "server_secret_hash": "hex-string",
  "server_secret": "hex-string or null if race not finished",
  "ticks": [
    {
      "tick_number": 1,
      "randomness_seed": "hex-string",
      "public_entropy": "block-hash",
      "racer_positions": {
        "racer-uuid-1": "4.2300",
        "racer-uuid-2": "5.1000"
      },
      "actions_applied": [
        {
          "action_type": "boost",
          "racer_id": "uuid",
          "player_id": "uuid",
          "amount": "0.10000000"
        }
      ],
      "active_effects": [
        {
          "type": "overclock",
          "racer_id": "uuid",
          "remaining_ticks": 4,
          "effect_per_tick": "+1.0"
        }
      ]
    }
  ]
}
```

---

### Player Actions

#### `POST /api/players/:id/cooldown-check`

Check if a player can perform an action right now.

**Request:**
```json
{
  "action_type": "boost"
}
```

**Response (200):**
```json
{
  "can_act": false,
  "cooldown_remaining_seconds": 32,
  "chaos_used_this_race": false
}
```

---

### Admin Endpoints

All admin endpoints require `Authorization: Bearer <ADMIN_TOKEN>` header. The admin token is configured via environment variable.

#### `GET /api/admin/races`

List all races with financial summaries.

**Response (200):**
```json
{
  "races": [
    {
      "id": "uuid",
      "label": "A",
      "race_date": "2026-03-09",
      "status": "active",
      "current_tick": 5,
      "total_prize_pool": "45.00000000",
      "total_treasury": "5.00000000",
      "total_reserve": "2.00000000",
      "participant_count": 12,
      "total_onchain_events": 47
    }
  ]
}
```

#### `POST /api/admin/races/:id/settle`

Trigger settlement for a finished race.

**Response (200):**
```json
{
  "race_id": "uuid",
  "status": "settling",
  "settlements_created": 8,
  "total_payout": "45.00000000"
}
```

**Errors:**
- `409` — race is not in `finished` status
- `401` — invalid admin token

#### `GET /api/admin/races/:id/financials`

Detailed financial breakdown for a race.

**Response (200):**
```json
{
  "race_id": "uuid",
  "backing": {
    "total_received": "50.00000000",
    "to_prize_pool": "45.00000000",
    "to_treasury": "5.00000000"
  },
  "actions": {
    "total_received": "8.50000000",
    "to_prize_pool": "3.82500000",
    "to_treasury": "2.97500000",
    "to_reserve": "1.70000000"
  },
  "settlements": {
    "total_paid": "48.82500000",
    "pending": 0,
    "confirmed": 8,
    "failed": 0
  }
}
```

---

## WebSocket Protocol

**Connection:** `ws://host:3001/ws`

### Client → Server Events

#### `join_race`
Subscribe to live updates for a race.
```json
{
  "event": "join_race",
  "data": {
    "race_id": "uuid",
    "player_id": "uuid"
  }
}
```
**Response:** Server immediately sends `race_state` with current state.

#### `leave_race`
Unsubscribe from a race.
```json
{
  "event": "leave_race",
  "data": {
    "race_id": "uuid"
  }
}
```

---

### Server → Client Events

#### `race_state`
Full current state, sent on join and after reconnect.
```json
{
  "event": "race_state",
  "data": {
    "race_id": "uuid",
    "current_tick": 5,
    "status": "active",
    "next_tick_at": "2026-03-09T03:00:00Z",
    "total_prize_pool": "45.00000000",
    "racers": [
      {
        "id": "uuid",
        "slot": 1,
        "name": "Blaze",
        "archetype": "sprinter",
        "position": "22.5000",
        "total_backing": "15.00000000"
      }
    ]
  }
}
```

#### `tick_update`
Sent after each tick is processed.
```json
{
  "event": "tick_update",
  "data": {
    "race_id": "uuid",
    "tick": 6,
    "next_tick_at": "2026-03-09T03:30:00Z",
    "racers": [
      {
        "id": "uuid",
        "position": "26.8000",
        "delta": "+4.3000"
      }
    ],
    "actions_applied": [
      {
        "action_type": "boost",
        "racer_id": "uuid",
        "racer_name": "Blaze"
      }
    ]
  }
}
```

#### `new_action`
Sent immediately when a valid action transaction is detected (before tick application).
```json
{
  "event": "new_action",
  "data": {
    "race_id": "uuid",
    "action_type": "emp",
    "racer_id": "uuid",
    "racer_name": "Blaze",
    "player_masked": "sm1...xyz",
    "amount": "0.20000000",
    "timestamp": "2026-03-09T02:45:00Z"
  }
}
```

#### `new_backing`
Sent when a backing transaction is confirmed.
```json
{
  "event": "new_backing",
  "data": {
    "race_id": "uuid",
    "racer_id": "uuid",
    "racer_name": "Blaze",
    "amount": "3.00000000",
    "new_total_backing": "18.00000000",
    "new_prize_pool": "47.70000000",
    "player_masked": "sm1...abc",
    "timestamp": "2026-03-09T02:45:30Z"
  }
}
```

#### `race_finished`
Sent when tick 24 completes.
```json
{
  "event": "race_finished",
  "data": {
    "race_id": "uuid",
    "podium": [
      { "place": 1, "racer_id": "uuid", "racer_name": "Blaze", "position": "100.0000" },
      { "place": 2, "racer_id": "uuid", "racer_name": "Shadow", "position": "95.3200" },
      { "place": 3, "racer_id": "uuid", "racer_name": "Volt", "position": "91.1500" }
    ],
    "total_prize_pool": "48.82500000",
    "server_secret": "hex-string"
  }
}
```

#### `countdown`
Sent every 60 seconds during active race, for UI countdown timers.
```json
{
  "event": "countdown",
  "data": {
    "race_id": "uuid",
    "next_tick_in_seconds": 420,
    "current_tick": 5
  }
}
```

---

## Error Response Format

All error responses follow this structure:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Invalid identity_type. Must be 'spark_address' or 'spark_name'."
}
```

## Rate Limiting (API Level)

- General API: 100 requests/minute per IP
- Player registration: 10 requests/minute per IP
- Admin endpoints: 30 requests/minute per admin token
