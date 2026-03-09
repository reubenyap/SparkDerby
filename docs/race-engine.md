# Spark Rush — Race Engine Design

## Overview

The race engine is a deterministic tick-based simulation. Given the same server secret, public entropy, and sequence of on-chain events, the engine produces identical results every time. This determinism enables post-race auditing.

---

## Race Lifecycle

```
pending → open → active → finished → settled
```

| Status   | Duration | What happens |
|----------|----------|--------------|
| pending  | ~5 min   | Race created, addresses being generated |
| open     | Variable | Addresses ready, backing accepted, no ticks yet |
| active   | 12 hours | Ticks 1–24 processed every 30 min; backing + actions accepted |
| finished | Until admin acts | Tick 24 done, no more actions, awaiting settlement |
| settled  | Permanent | Payouts sent, server_secret revealed |

**Timing:**
- Race A: created ~23:55 UTC, opens ~00:00, first tick 00:30, last tick 12:00
- Race B: created ~11:55 UTC, opens ~12:00, first tick 12:30, last tick 00:00

---

## Tick Simulation

### Tick Formula

Each tick, every racer's position is updated:

```
base = archetype_speed(archetype, tick_phase(tick))
random = derive_random(tick_seed, racer_slot) * variance(archetype)
effects = sum_of_active_effects(racer)
move = max(base + random + effects, 0)
new_position = min(position + move, 100)
```

- `base` — archetype-determined speed for this phase of the race
- `random` — derived from commit-reveal seed, scaled by archetype variance
- `effects` — net sum of active boosts and debuffs
- `move` — clamped to be non-negative (a racer can never move backward from debuffs alone below zero movement, but debuffs can reduce a tick's movement to zero)
- `new_position` — capped at 100

### Race Completion

The race runs for exactly 24 ticks. Final standings are determined by position at tick 24. If a racer reaches position 100 before tick 24, they stop advancing but the race continues for all other racers (there may be strategic value in actions on other racers). Ties are broken by who reached the higher position first (earliest tick).

---

## Archetype Profiles

Six archetypes with equal long-run expected value (~96 total distance over 24 ticks) but different speed distributions and variance characteristics.

### Speed by Phase

| Archetype  | Early (ticks 1–8) | Mid (ticks 9–16) | Late (ticks 17–24) | Total (expected) |
|------------|-------------------|-------------------|---------------------|------------------|
| Balanced   | 4.00              | 4.00              | 4.00                | 96.0             |
| Sprinter   | 5.50              | 4.00              | 2.83                | 98.6             |
| Closer     | 2.83              | 4.00              | 5.50                | 98.6             |
| Tank       | 3.50              | 3.80              | 4.70                | 96.0             |
| Wildcard   | 4.00              | 4.00              | 4.00                | 96.0             |
| Technician | 3.80              | 4.50              | 3.95                | 98.0             |

**Note:** Slight variations in totals above 96 are by design — different archetypes having slightly different expected totals creates interesting strategic choices. The variance characteristics are what truly differentiate them.

### Variance (random component scaling)

| Archetype  | Variance Range | Description |
|------------|---------------|-------------|
| Balanced   | ±0.50         | Steady, predictable |
| Sprinter   | ±0.50         | Fast start, fades predictably |
| Closer     | ±0.50         | Slow start, strong finish predictably |
| Tank       | ±0.30         | Most consistent, minimal randomness |
| Wildcard   | ±2.00         | Extreme swings — can surge or stall |
| Technician | ±0.50         | Strong mid-game, moderate variance |

### Implementation

```typescript
interface ArchetypeProfile {
  speeds: { early: number; mid: number; late: number };
  variance: number;
}

const PROFILES: Record<string, ArchetypeProfile> = {
  balanced:   { speeds: { early: 4.00, mid: 4.00, late: 4.00 }, variance: 0.50 },
  sprinter:   { speeds: { early: 5.50, mid: 4.00, late: 2.83 }, variance: 0.50 },
  closer:     { speeds: { early: 2.83, mid: 4.00, late: 5.50 }, variance: 0.50 },
  tank:       { speeds: { early: 3.50, mid: 3.80, late: 4.70 }, variance: 0.30 },
  wildcard:   { speeds: { early: 4.00, mid: 4.00, late: 4.00 }, variance: 2.00 },
  technician: { speeds: { early: 3.80, mid: 4.50, late: 3.95 }, variance: 0.50 },
};

function getPhase(tick: number): 'early' | 'mid' | 'late' {
  if (tick <= 8) return 'early';
  if (tick <= 16) return 'mid';
  return 'late';
}

function getBaseSpeed(archetype: string, tick: number): number {
  const profile = PROFILES[archetype];
  return profile.speeds[getPhase(tick)];
}
```

---

## Randomness

### Commit-Reveal Scheme

**At race creation:**
```
server_secret = crypto.randomBytes(32).toString('hex')   // 64 hex chars
server_secret_hash = SHA256(server_secret)                // published
```

**Per tick:**
```
public_entropy = latest_firo_block_hash_before_tick_time
tick_seed = HMAC-SHA256(server_secret, `${race_id}:${tick_number}:${public_entropy}`)
```

**After race:** `server_secret` is revealed. Anyone can:
1. Verify `SHA256(server_secret) === server_secret_hash`
2. For each tick, recompute `tick_seed` using the recorded `public_entropy`
3. Reproduce all racer movements and verify the audit log

### Deriving Per-Racer Randomness

From the 32-byte `tick_seed`, extract a float per racer:

```typescript
function deriveRacerRandom(tickSeed: Buffer, slot: number, variance: number): number {
  // Use HMAC to derive per-racer bytes
  const racerBytes = HMAC_SHA256(tickSeed, `racer:${slot}`);
  // Convert first 4 bytes to unsigned 32-bit int
  const uint32 = racerBytes.readUInt32BE(0);
  // Normalize to [-1, 1]
  const normalized = (uint32 / 0xFFFFFFFF) * 2 - 1;
  // Scale by variance
  return normalized * variance;
}
```

---

## Actions

### Action Types

| Action     | Cost (FIRO) | Target    | Effect | Duration |
|-----------|-------------|-----------|--------|----------|
| Boost     | 0.10        | One racer | +1.5 position | 1 tick (instant) |
| EMP       | 0.20        | One racer | -2.0 position | 1 tick (instant) |
| Oil Slick | 0.20        | One racer | -1.0 position per tick | 3 ticks |
| Overclock | 0.50        | One racer | +1.0 position per tick | 5 ticks |
| Black Swan| 1.00        | Global    | Random chaos event | Varies |

### Action Processing

Actions are collected between ticks via the Chain Watcher. At each tick:

1. Read all `onchain_events` where `applied = false` and `rejected_reason IS NULL` and `instant_locked = true`
2. Filter out events received after the tick cutoff time
3. Apply immediate effects (Boost, EMP) directly to this tick's calculation
4. Register multi-tick effects (Oil Slick, Overclock) in the active effects list
5. Process Black Swan events
6. Mark events as `applied = true` with `applied_at_tick`

### Multi-Tick Effects

Active effects are tracked as a list:

```typescript
interface ActiveEffect {
  type: 'oil_slick' | 'overclock';
  racer_id: string;
  remaining_ticks: number;
  effect_per_tick: number;  // negative for debuffs, positive for buffs
  applied_by_player: string;
  applied_at_tick: number;
}
```

Each tick:
1. Apply each active effect's `effect_per_tick` to the racer's movement
2. Decrement `remaining_ticks`
3. Remove effects where `remaining_ticks === 0`

### Diminishing Returns

When the same racer receives multiple debuffs (EMP or Oil Slick) within a 5-minute window:

```
effective_amount = base_amount * (0.5 ^ repeat_count)
```

| Debuff # | Effectiveness |
|----------|--------------|
| 1st      | 100%         |
| 2nd      | 50%          |
| 3rd      | 25%          |
| 4th      | 12.5%        |

The 5-minute window is a rolling window: for each new debuff on a racer, count how many other debuffs hit the same racer in the last 5 minutes.

### Black Swan (Chaos Events)

When a Black Swan transaction is detected, the chaos event is determined from the tick randomness:

```typescript
function determineChaoEvent(tickSeed: Buffer): ChaosEvent {
  const chaosBytes = HMAC_SHA256(tickSeed, 'chaos');
  const roll = chaosBytes.readUInt32BE(0) % 100;

  if (roll < 25) return { type: 'position_shuffle' };      // shuffle all positions randomly
  if (roll < 50) return { type: 'freeze_leader' };          // top racer gets 0 movement next tick
  if (roll < 75) return { type: 'boost_underdogs' };         // bottom 3 racers get +2.0 this tick
  return { type: 'speed_storm' };                            // all racers get ±3.0 random this tick
}
```

| Chaos Event     | Effect |
|----------------|--------|
| Position Shuffle | Randomly redistribute all racer positions (sum stays the same) |
| Freeze Leader   | The racer in 1st place gets 0 movement on the next tick |
| Boost Underdogs | Bottom 3 racers each get +2.0 bonus this tick |
| Speed Storm     | All racers get an additional ±3.0 random component this tick |

---

## Rate Limits

### Action Cooldown

- **1 action per 60 seconds per player identity** (resolved Spark address)
- Tracked in Redis: `cooldown:{resolved_address}` with 60-second TTL
- If a transaction arrives during cooldown:
  - The `onchain_event` is recorded with `rejected_reason = 'cooldown'`
  - The FIRO is not refunded (it stays in the game's wallet)
  - The action is NOT applied to race logic

### Chaos Limit

- **1 Black Swan per identity per race**
- Tracked in database: check `onchain_events` for existing applied Black Swan from this player in this race
- Second Black Swan: recorded with `rejected_reason = 'chaos_limit'`

### Late Transactions

- Transactions arriving after the current tick's processing cutoff are recorded with `rejected_reason = 'late'`
- Cutoff: the moment the tick processor starts running (approximately every 30 min on the clock)
- Late transactions that are backing (not actions) may still be applied if backing is accepted continuously

---

## Financial Splits

### Backing Transactions (≥ 1 FIRO)

```
prize_pool += amount * 0.90
treasury   += amount * 0.10
```

### Action Transactions

```
prize_pool += amount * 0.45
treasury   += amount * 0.35
reserve    += amount * 0.20
```

### Prize Pool Distribution

After race finishes, the total `prize_pool` is split:

| Place | Share |
|-------|-------|
| 1st   | 60%   |
| 2nd   | 25%   |
| 3rd   | 15%   |

### Payout Formula

For each player who backed a podium racer:

```
place_bucket = total_prize_pool * place_percentage
player_payout = place_bucket * (player_backing_on_racer / total_backing_on_racer)
```

**Example:**
- Total prize pool: 100 FIRO
- 1st place bucket: 60 FIRO
- Player backed 5 FIRO on the 1st place racer
- Total backing on 1st place racer: 20 FIRO
- Player payout: 60 * (5/20) = **15 FIRO**

**Important:** Action spending does NOT affect payout share. Only backing amount matters.

---

## Tick Processing Pseudocode

```typescript
async function processTick(raceId: string, tickNumber: number): Promise<void> {
  const race = await getRace(raceId);
  const racers = await getRacers(raceId);

  // 1. Derive randomness
  const publicEntropy = await getLatestBlockHash();
  const tickSeed = hmacSHA256(race.server_secret, `${raceId}:${tickNumber}:${publicEntropy}`);

  // 2. Collect pending actions
  const pendingActions = await getPendingActions(raceId);

  // 3. Load active multi-tick effects
  const activeEffects = await getActiveEffects(raceId);

  // 4. Process each racer
  for (const racer of racers) {
    if (racer.position >= 100) continue; // already finished

    // Base speed
    let move = getBaseSpeed(racer.archetype, tickNumber);

    // Random component
    move += deriveRacerRandom(tickSeed, racer.slot, PROFILES[racer.archetype].variance);

    // Instant actions (Boost, EMP)
    for (const action of pendingActions.filter(a => a.racer_id === racer.id)) {
      if (action.action_type === 'boost') {
        move += 1.5;
      } else if (action.action_type === 'emp') {
        const diminish = computeDiminishingReturns(racer.id, 'emp', pendingActions);
        move -= 2.0 * diminish;
      }
    }

    // Multi-tick effects
    for (const effect of activeEffects.filter(e => e.racer_id === racer.id)) {
      move += effect.effect_per_tick;
    }

    // Apply chaos effects if any
    move += getChaosEffect(racer, tickNumber);

    // Clamp and update
    move = Math.max(move, 0);
    racer.position = Math.min(racer.position + move, 100);
  }

  // 5. Register new multi-tick effects
  for (const action of pendingActions) {
    if (action.action_type === 'oil_slick') {
      const diminish = computeDiminishingReturns(action.racer_id, 'oil_slick', pendingActions);
      activeEffects.push({
        type: 'oil_slick',
        racer_id: action.racer_id,
        remaining_ticks: 3,
        effect_per_tick: -1.0 * diminish,
        applied_at_tick: tickNumber,
      });
    } else if (action.action_type === 'overclock') {
      activeEffects.push({
        type: 'overclock',
        racer_id: action.racer_id,
        remaining_ticks: 5,
        effect_per_tick: 1.0,
        applied_at_tick: tickNumber,
      });
    }
  }

  // 6. Decrement multi-tick effects
  for (const effect of activeEffects) {
    effect.remaining_ticks--;
  }
  const updatedEffects = activeEffects.filter(e => e.remaining_ticks > 0);

  // 7. Mark actions as applied
  await markActionsApplied(pendingActions, tickNumber);

  // 8. Save tick snapshot
  await saveTickSnapshot({
    race_id: raceId,
    tick_number: tickNumber,
    randomness_seed: tickSeed.toString('hex'),
    public_entropy: publicEntropy,
    racer_positions: racers.reduce((acc, r) => ({ ...acc, [r.id]: r.position }), {}),
    actions_applied: pendingActions,
    active_effects: updatedEffects,
  });

  // 9. Update race state
  await updateRaceTick(raceId, tickNumber);

  // 10. Broadcast
  await publishTickUpdate(raceId, tickNumber, racers);
}
```

---

## Assumptions

1. The Firo block hash used as public entropy is available via RPC (`getbestblockhash`) at tick time.
2. Tick processing completes quickly (< 1 second) — no risk of overlapping ticks at 30-minute intervals.
3. The 5-minute diminishing returns window uses `detected_at` timestamps from `onchain_events`.
4. Position 100 represents the finish line. Racers that reach 100 stop advancing but remain in the standings.

## Risks

1. **All racers reach 100 before tick 24:** Ties are broken by earliest arrival tick. If multiple arrive on the same tick, the one with higher speed that tick wins.
2. **No backing on a podium racer:** If a racer finishes in the top 3 but has no backers, that place's prize bucket rolls into the treasury.
3. **Wildcard variance:** The ±2.0 variance on Wildcard means they could have a tick range of [0, 8.0]. This is intentional but may need tuning based on playtesting.
