# Race Engine — Implementation Reference

## Location

`packages/shared/src/engine/`

The engine is a pure, deterministic TypeScript module with no database or network
dependencies. Given the same inputs it always produces identical outputs, enabling
post-race auditing and client-side replay verification.

---

## Module Overview

| File | Responsibility |
|------|---------------|
| `types.ts` | All engine-specific interfaces (`RacerState`, `EngineAction`, `ActiveEffect`, `TickResult`, `RaceResult`, `PayoutResult`, `ReplayLog`, etc.) |
| `random.ts` | HMAC-SHA256 commit-reveal scheme, per-tick seed derivation, per-racer random, chaos roll, shuffle, storm values |
| `archetype.ts` | Phase-based speed curves (early/mid/late), variance, stamina decay, expected distance |
| `actions.ts` | Action validation (rate limits, chaos limits), diminishing returns, multi-tick effect creation, chaos event determination |
| `tick.ts` | Single-tick processor: movement calculation, effect application, action processing |
| `race.ts` | Full 24-tick race runner, finish order determination |
| `payout.ts` | Pari-mutuel payout calculation, projected payout computation |
| `replay.ts` | Replay log generation and verification (re-runs the race and compares) |

---

## Determinism Contract

```
runRace(config, publicEntropies, actions) → RaceResult
```

The same `serverSecret`, `publicEntropies` (one Firo block hash per tick), and
`actions` list (sorted by `submittedAt` within each tick) will always produce:

- Identical tick seeds
- Identical racer positions at every tick
- Identical finish order

This is enforced by 83 unit tests including explicit determinism assertions.

---

## Archetype Balance

Six archetypes with near-equal expected distance over 24 ticks (~96 units):

| Archetype | Early (×8) | Mid (×8) | Late (×8) | Expected | Variance |
|-----------|-----------|----------|-----------|----------|----------|
| Balanced | 4.00 | 4.00 | 4.00 | 96.0 | ±0.50 |
| Sprinter | 5.50 | 4.00 | 2.83 | 98.6 | ±0.50 |
| Closer | 2.83 | 4.00 | 5.50 | 98.6 | ±0.50 |
| Tank | 3.50 | 3.80 | 4.70 | 96.0 | ±0.30 |
| Wildcard | 4.00 | 4.00 | 4.00 | 96.0 | ±2.00 |
| Technician | 3.80 | 4.50 | 3.95 | 98.0 | ±0.50 |

Stamina is tracked cosmetically (starts 100, decays per archetype) but does not
affect speed. The phase-based speed curves encode fatigue implicitly.

---

## Tick Processing Order

1. Derive `tickSeed = HMAC-SHA256(serverSecret, raceId:tick:publicEntropy)`
2. Validate pending actions (rate limit, chaos limit)
3. If Black Swan triggers `position_shuffle`, reassign positions before movement
4. For each racer:
   - `base = phaseSpeed(archetype, tick)`
   - `random = HMAC(tickSeed, racer:lane) → [-variance, +variance]`
   - `+= existing multi-tick effects` (from prior ticks)
   - `+= instant actions` (boost +1.5, emp −2.0×diminishing)
   - `+= chaos modifiers` (boost_underdogs +2.0, speed_storm ±3.0)
   - `move = max(0, total)` → `position = min(position + move, 100)`
5. Register new multi-tick effects (applied starting **next** tick)
6. Decrement existing effects, remove expired

Freeze Leader creates a 1-tick debuff applied on the **next** tick.

---

## Actions

| Action | Cost | Type | Effect | Duration |
|--------|------|------|--------|----------|
| Boost | 0.10 FIRO | Buff | +1.5 speed | Instant |
| EMP | 0.20 FIRO | Debuff | −2.0 speed | Instant |
| Oil Slick | 0.20 FIRO | Debuff | −1.0 speed/tick | 3 ticks |
| Overclock | 0.50 FIRO | Buff | +1.0 speed/tick | 5 ticks |
| Black Swan | 1.00 FIRO | Chaos | Random event | Varies |

### Rate Limiting

- **1 action per 60 seconds** per player identity
- **1 Black Swan per race** per player identity
- Violations are recorded as rejected actions (funds not refunded)

### Diminishing Returns

Repeated debuffs on the same racer within 5 minutes:

```
effective = baseMagnitude × 0.6^(priorDebuffCount)
```

| Debuff # | Effectiveness |
|----------|--------------|
| 1st | 100% |
| 2nd | 60% |
| 3rd | 36% |
| 4th | 21.6% |

### Chaos Events (Black Swan)

Determined from `HMAC(tickSeed, "chaos") % 100`:

| Roll | Event | Effect |
|------|-------|--------|
| 0–24 | Position Shuffle | Redistribute positions randomly (sum preserved) |
| 25–49 | Freeze Leader | Leader gets 0 movement next tick |
| 50–74 | Boost Underdogs | Bottom 3 racers +2.0 this tick |
| 75–99 | Speed Storm | All racers ±3.0 random this tick |

---

## Randomness (Commit-Reveal)

```
serverSecret = crypto.randomBytes(32)
serverSecretHash = SHA256(serverSecret)        ← published at race creation
tickSeed = HMAC-SHA256(serverSecret, raceId:tick:firoBlockHash)
racerRandom = HMAC-SHA256(tickSeed, racer:lane) → normalize to [-1,1] × variance
```

After race: `serverSecret` revealed. Anyone can verify `SHA256(serverSecret) === hash`
and replay all 24 ticks deterministically.

---

## Payout Calculation

Pari-mutuel model. Only **backing amounts** affect payout share — action spend
does not.

### Pool Splits

| Source | Prize Pool | Treasury | Reserve |
|--------|-----------|----------|---------|
| Backing | 90% | 10% | — |
| Action | 45% | 35% | 20% |

### Place Distribution

| Place | Share of Prize Pool |
|-------|-------------------|
| 1st | 60% |
| 2nd | 25% |
| 3rd | 15% |

### Per-Player Payout

```
playerPayout = placePool × (playerBacking / totalBackingOnRacer)
```

If a podium racer has zero backers, that place's pool is unclaimed.

### Projected Payouts

`projectPayouts(playerId, allBackings, totalBacking, totalActionSpend)` returns
hypothetical payouts for each place each backed racer might finish.

---

## Replay Log

`generateReplayLog(...)` produces a self-contained JSON object:

```json
{
  "version": "1.0",
  "raceId": "...",
  "serverSecretHash": "...",
  "serverSecret": "...",
  "racers": [...],
  "publicEntropies": { "1": "...", ... },
  "actions": [...],
  "ticks": [...],
  "finishOrder": [...]
}
```

`verifyReplayLog(log)` re-runs the race and compares tick seeds and finish order.

---

## Tests

83 tests across 6 suites in `src/engine/__tests__/`:

- `random.test.ts` — determinism, range bounds, uniqueness
- `archetype.test.ts` — phase mapping, expected distance balance, variance ordering
- `actions.test.ts` — rate limiting, chaos limits, diminishing returns, multi-tick effects
- `tick.test.ts` — movement, instant actions, effect application, position clamping
- `race.test.ts` — full race determinism, action integration, replay verification
- `payout.test.ts` — pool splits, proportional payouts, projections

Run: `cd packages/shared && npm test`
