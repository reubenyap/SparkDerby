# Spark Rush — Firo Integration Design

## Overview

All Firo blockchain interaction goes through a dedicated adapter layer. The system never calls Firo RPC directly from game logic. Three services comprise the Firo integration:

1. **Firo RPC Adapter** — thin JSON-RPC client wrapping all Firo node calls
2. **Chain Watcher** — continuously monitors for new Spark transactions and classifies them
3. **Address Manager** — generates and tracks per-race Spark receiving addresses

Additionally, the **Settlement Engine** uses the RPC Adapter to send payouts.

---

## 1. Firo RPC Adapter

### Purpose

Single point of contact with the Firo node. Encapsulates JSON-RPC transport, error handling, retries, and response parsing. No game logic lives here.

### Configuration

```
FIRO_RPC_HOST=127.0.0.1
FIRO_RPC_PORT=8888
FIRO_RPC_USER=sparkrish
FIRO_RPC_PASSWORD=<secret>
FIRO_RPC_TIMEOUT=30000
FIRO_RPC_MAX_RETRIES=3
```

### Interface

```typescript
interface SparkMint {
  txid: string;
  amount: number;
  address: string;
  memo: string;
  confirmations: number;
  isSpent: boolean;
}

interface TransactionInfo {
  txid: string;
  amount: number;
  confirmations: number;
  instantlock: boolean;
  time: number;
  blockHash?: string;
  details: Array<{
    address: string;
    amount: number;
    category: string;
  }>;
}

interface CoinAddressInfo {
  address: string;
  memo: string;
  amount: number;
}

interface SpendOutput {
  amount: number;
  subtractfee?: boolean;
  memo?: string;
}

interface FiroRpcService {
  // Address generation
  generateSparkAddress(): Promise<string>;
  getAllSparkAddresses(): Promise<string[]>;
  getDefaultSparkAddress(): Promise<string>;

  // Transaction monitoring
  listSparkMints(): Promise<SparkMint[]>;
  listUnspentSparkMints(): Promise<SparkMint[]>;
  getTransaction(txid: string): Promise<TransactionInfo>;
  getSparkCoinAddress(txHash: string): Promise<CoinAddressInfo>;
  identifySparkCoins(txHash: string): Promise<void>;

  // Balance
  getSparkBalance(): Promise<number>;

  // Sending
  spendSpark(outputs: Record<string, SpendOutput>): Promise<string>;

  // Spark Names
  resolveSparkName(name: string): Promise<string>;

  // Block info (for public entropy)
  getBestBlockHash(): Promise<string>;

  // Health
  ping(): Promise<boolean>;
}
```

### JSON-RPC Transport

```typescript
class FiroRpcClient {
  private readonly url: string;
  private requestId = 0;

  async call<T>(method: string, params: any[] = []): Promise<T> {
    const body = {
      jsonrpc: '1.0',
      id: ++this.requestId,
      method,
      params,
    };

    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${user}:${password}`),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeout),
    });

    const json = await response.json();
    if (json.error) {
      throw new FiroRpcError(json.error.code, json.error.message);
    }
    return json.result;
  }
}
```

### Method Mapping

| Service Method | Firo RPC Call | Notes |
|---------------|---------------|-------|
| `generateSparkAddress()` | `getnewsparkaddress` | Returns 144-char "sm..." address |
| `getAllSparkAddresses()` | `getallsparkaddresses` | Lists all generated addresses |
| `listSparkMints()` | `listsparkmints` | All mints (spent + unspent), wallet must be unlocked |
| `listUnspentSparkMints()` | `listunspentsparkmints` | Unspent only |
| `getTransaction(txid)` | `gettransaction txid` | Includes `instantlock` boolean field |
| `getSparkCoinAddress(hash)` | `getsparkcoinaddr hash` | Returns [address, memo, amount] |
| `spendSpark(outputs)` | `spendspark {addr: {amount, ...}}` | Private Spark-to-Spark send |
| `getSparkBalance()` | `getsparkbalance` | Total Spark balance |
| `resolveSparkName(name)` | `resolvesparkname name` | Returns resolved Spark address |
| `getBestBlockHash()` | `getbestblockhash` | For public entropy source |

### Error Handling

- **Connection refused:** Log error, mark Firo node as unhealthy, retry with exponential backoff (1s, 2s, 4s)
- **Wallet locked:** Log critical error, alert admin. Operations requiring unlocked wallet will fail.
- **RPC timeout:** Retry up to `MAX_RETRIES` times. If all fail, propagate error.
- **Invalid params:** Do not retry. Log and propagate.

### Health Check

The adapter exposes a health endpoint that the API layer can query:

```typescript
async isHealthy(): Promise<{ healthy: boolean; lastSuccessfulCall: Date; error?: string }> {
  try {
    await this.ping();
    return { healthy: true, lastSuccessfulCall: new Date() };
  } catch (e) {
    return { healthy: false, lastSuccessfulCall: this.lastSuccess, error: e.message };
  }
}
```

---

## 2. Chain Watcher Service

### Purpose

Continuously monitors the Firo wallet for new Spark transactions. When a new transaction is detected and InstantLocked, it classifies the transaction into a race action and records it.

### Polling Loop

```
Every 5 seconds:
  1. Call listSparkMints()
  2. Compare against last-known mint set (tracked by txid in Redis)
  3. For each new mint:
     a. Call getTransaction(txid) → check instantlock
     b. If not yet instantlocked, add to retry queue (check again in 5s)
     c. If instantlocked, process the transaction
  4. Update last-known mint set
```

### Transaction Classification

```typescript
async function classifyTransaction(mint: SparkMint): Promise<ClassifiedAction | null> {
  // 1. Look up the destination address in our mapping
  const mapping = await lookupAddressMapping(mint.address);
  if (!mapping) {
    // Transaction to an unknown address — not a game action
    // Log for audit but do not process
    return null;
  }

  // 2. Determine action type and target
  const { race_id, racer_id, action_type } = mapping;

  // 3. Validate the race is accepting this type of action
  const race = await getRace(race_id);
  if (race.status === 'pending' || race.status === 'settled') {
    return { ...mapping, rejected_reason: 'race_not_active' };
  }

  // 4. Validate amount
  if (action_type === 'backing' && mint.amount < 1.0) {
    return { ...mapping, rejected_reason: 'below_minimum' };
  }

  const expectedAmounts: Record<string, number> = {
    boost: 0.10,
    emp: 0.20,
    oil_slick: 0.20,
    overclock: 0.50,
    black_swan: 1.00,
  };

  if (action_type !== 'backing') {
    const expected = expectedAmounts[action_type];
    // Accept if within tolerance (handles rounding, fees)
    if (mint.amount < expected - 0.001) {
      return { ...mapping, rejected_reason: 'below_minimum' };
    }
    // If overpaid, treat excess as donation to treasury
  }

  // 5. Identify player (if possible)
  const player = await identifyPlayer(mint);

  // 6. Check rate limits
  if (action_type !== 'backing' && player) {
    const onCooldown = await checkCooldown(player.resolved_address);
    if (onCooldown) {
      return { ...mapping, player_id: player.id, rejected_reason: 'cooldown' };
    }

    if (action_type === 'black_swan') {
      const chaosUsed = await checkChaosLimit(player.id, race_id);
      if (chaosUsed) {
        return { ...mapping, player_id: player.id, rejected_reason: 'chaos_limit' };
      }
    }

    // Set cooldown
    await setCooldown(player.resolved_address, 60); // 60 seconds TTL in Redis
  }

  // 7. Check timing
  if (race.status === 'finished') {
    return { ...mapping, player_id: player?.id, rejected_reason: 'late' };
  }

  return {
    race_id,
    racer_id,
    action_type,
    player_id: player?.id,
    amount: mint.amount,
    rejected_reason: null,
  };
}
```

### Player Identification

Since Spark transactions are privacy-preserving, the Chain Watcher uses `getsparkcoinaddr` to get the address/memo/amount for transactions to the game's wallet:

```typescript
async function identifyPlayer(mint: SparkMint): Promise<Player | null> {
  // The destination address is one of our generated addresses
  // We need to figure out WHO sent it

  // Option A: The player includes their identity in the memo field
  const coinInfo = await firoRpc.getSparkCoinAddress(mint.txid);
  if (coinInfo.memo) {
    // Try to match memo to a registered player
    const player = await findPlayerByIdentity(coinInfo.memo);
    if (player) return player;
  }

  // Option B: For MVP, we may not be able to identify the sender
  // of a Spark transaction (privacy feature). The action is still
  // valid but won't be attributed to a specific player for rate
  // limiting purposes.
  //
  // Rate limiting falls back to: unidentified actions are allowed
  // but cannot claim payouts (backing requires identified player).

  return null;
}
```

**Note on player identification:** This is a fundamental challenge with privacy-preserving Spark transactions. For MVP, the approach is:
- Backing transactions: Player must be registered and include their player_id or identity in the memo field
- Action transactions: Same, but unidentified actions are still applied (just not rate-limited per player)
- The frontend provides pre-filled transaction instructions including the memo

### Address Mapping Lookup

The Chain Watcher maintains an in-memory cache (refreshed from DB) of all active race addresses:

```typescript
// Redis hash: race_addresses:{race_id}
// field: spark_address → value: JSON { racer_id, action_type }

// Also: global lookup hash
// field: spark_address → value: JSON { race_id, racer_id, action_type }

async function lookupAddressMapping(address: string): Promise<AddressMapping | null> {
  // Check Redis cache first
  const cached = await redis.hget('address_lookup', address);
  if (cached) return JSON.parse(cached);

  // Fall back to DB
  // Check racers table (backing, boost, emp, oil_slick, overclock addresses)
  // Check races table (chaos_address)
  const mapping = await queryAddressFromDB(address);
  if (mapping) {
    await redis.hset('address_lookup', address, JSON.stringify(mapping));
  }
  return mapping;
}
```

### Event Publishing

After classification, the Chain Watcher publishes events via Redis pub/sub:

```typescript
// Channel: race_events:{race_id}
await redis.publish(`race_events:${raceId}`, JSON.stringify({
  type: actionType === 'backing' ? 'new_backing' : 'new_action',
  race_id: raceId,
  racer_id: racerId,
  action_type: actionType,
  amount: amount,
  player_masked: maskAddress(playerAddress),
  timestamp: new Date().toISOString(),
}));
```

The API WebSocket gateway subscribes to these channels and broadcasts to connected clients.

---

## 3. Address Manager Service

### Purpose

Generates unique Spark addresses for each race and maintains the mapping between addresses and their intended purpose.

### Address Generation

When a new race is created:

```typescript
async function generateRaceAddresses(raceId: string, racerSlots: RacerSlot[]): Promise<void> {
  const actionTypes = ['backing', 'boost', 'emp', 'oil_slick', 'overclock'];

  for (const racer of racerSlots) {
    const addresses: Record<string, string> = {};

    for (const action of actionTypes) {
      addresses[action] = await firoRpc.generateSparkAddress();
    }

    // Store on racer record
    await updateRacer(racer.id, {
      backing_address: addresses.backing,
      boost_address: addresses.boost,
      emp_address: addresses.emp,
      oil_slick_address: addresses.oil_slick,
      overclock_address: addresses.overclock,
    });

    // Cache in Redis for fast lookup
    for (const [action, address] of Object.entries(addresses)) {
      await redis.hset('address_lookup', address, JSON.stringify({
        race_id: raceId,
        racer_id: racer.id,
        action_type: action,
      }));
    }
  }

  // Generate global chaos (Black Swan) address
  const chaosAddress = await firoRpc.generateSparkAddress();
  await updateRace(raceId, { chaos_address: chaosAddress });
  await redis.hset('address_lookup', chaosAddress, JSON.stringify({
    race_id: raceId,
    racer_id: null,
    action_type: 'black_swan',
  }));
}
```

### Address Count Per Race

| Addresses | Calculation |
|-----------|-------------|
| 30 | 6 racers × 5 action types (backing, boost, emp, oil_slick, overclock) |
| 1  | Global chaos (Black Swan) |
| **31** | **Total per race** |

With 2 races per day: **62 new Spark addresses generated daily**.

### Address Cleanup

Old race addresses remain in the database for audit purposes. The Redis cache is cleaned up when a race is settled:

```typescript
async function cleanupRaceAddresses(raceId: string): Promise<void> {
  const racers = await getRacers(raceId);
  const race = await getRace(raceId);

  for (const racer of racers) {
    for (const addr of [racer.backing_address, racer.boost_address, racer.emp_address,
                         racer.oil_slick_address, racer.overclock_address]) {
      await redis.hdel('address_lookup', addr);
    }
  }
  await redis.hdel('address_lookup', race.chaos_address);
}
```

---

## 4. Settlement Engine

### Purpose

After a race finishes (tick 24 complete), computes pari-mutuel payouts and sends FIRO to winners' snapshotted payout addresses.

### Settlement Flow

```typescript
async function settleRace(raceId: string): Promise<void> {
  const race = await getRace(raceId);
  if (race.status !== 'finished') throw new Error('Race not finished');

  // 1. Determine podium
  const racers = await getRacers(raceId);
  const sorted = racers.sort((a, b) => b.position - a.position);
  const podium = [
    { place: 1, racer: sorted[0] },
    { place: 2, racer: sorted[1] },
    { place: 3, racer: sorted[2] },
  ];

  // 2. Calculate prize buckets
  const buckets = {
    1: race.total_prize_pool * 0.60,
    2: race.total_prize_pool * 0.25,
    3: race.total_prize_pool * 0.15,
  };

  // 3. For each podium racer, compute per-backer payouts
  const settlements: Settlement[] = [];

  for (const { place, racer } of podium) {
    if (racer.total_backing === 0) {
      // No backers — bucket goes to treasury
      race.total_treasury += buckets[place];
      continue;
    }

    const backers = await getBackers(raceId, racer.id);
    const bucket = buckets[place];

    for (const backer of backers) {
      const share = backer.backing_amount / racer.total_backing;
      const payout = bucket * share;

      // Skip dust payouts (below network fee)
      if (payout < 0.001) {
        race.total_treasury += payout;
        continue;
      }

      settlements.push({
        race_id: raceId,
        player_id: backer.player_id,
        racer_id: racer.id,
        place,
        backing_amount: backer.backing_amount,
        payout_amount: payout,
        payout_address: backer.payout_address,
        status: 'pending',
      });
    }
  }

  // 4. Save settlement records
  await saveSettlements(settlements);

  // 5. Send payouts
  await sendPayouts(settlements);

  // 6. Reveal server secret
  await updateRace(raceId, { status: 'settled' });
}
```

### Payout Sending

Payouts are sent in batches to minimize transaction overhead:

```typescript
async function sendPayouts(settlements: Settlement[]): Promise<void> {
  // Group by payout address (a player may have backed multiple podium racers)
  const grouped = groupBy(settlements, s => s.payout_address);

  for (const [address, playerSettlements] of Object.entries(grouped)) {
    const totalPayout = playerSettlements.reduce((sum, s) => sum + s.payout_amount, 0);

    // Mark as sending
    await updateSettlementStatus(playerSettlements, 'sending');

    try {
      const txid = await firoRpc.spendSpark({
        [address]: {
          amount: totalPayout,
          memo: `Spark Rush payout - Race ${playerSettlements[0].race_id}`,
        },
      });

      // Mark as confirmed
      await updateSettlementStatus(playerSettlements, 'confirmed', txid);
    } catch (error) {
      // Mark as failed
      await updateSettlementStatus(playerSettlements, 'failed', null, error.message);
      // Failed payouts can be retried by admin
    }
  }
}
```

### Payout Verification

After sending, the settlement engine verifies each payout transaction:

```typescript
async function verifyPayout(txid: string): Promise<boolean> {
  const tx = await firoRpc.getTransaction(txid);
  return tx.instantlock === true;
}
```

---

## 5. Spark Name Resolution

### Flow

```typescript
async function resolveIdentity(
  identityType: 'spark_address' | 'spark_name',
  identityValue: string
): Promise<{ resolvedAddress: string; timestamp: Date }> {
  if (identityType === 'spark_address') {
    // Validate format: starts with "sm", ~144 chars
    if (!identityValue.startsWith('sm') || identityValue.length < 100) {
      throw new Error('Invalid Spark address format');
    }
    return {
      resolvedAddress: identityValue,
      timestamp: new Date(),
    };
  }

  if (identityType === 'spark_name') {
    // Strip @ prefix if present
    const name = identityValue.startsWith('@')
      ? identityValue.slice(1)
      : identityValue;

    const resolvedAddress = await firoRpc.resolveSparkName(name);
    if (!resolvedAddress) {
      throw new Error(`Spark Name "${identityValue}" not found`);
    }

    return {
      resolvedAddress,
      timestamp: new Date(),
    };
  }

  throw new Error('Invalid identity type');
}
```

### Caching

Spark Name resolutions are cached in Redis for 5 minutes to reduce RPC calls:

```
Key: spark_name:{name}
Value: resolved_address
TTL: 300 seconds
```

**Important:** The resolved address is snapshotted at race participation time. If a Spark Name re-points to a different address mid-race, the original snapshotted address is used for payouts.

---

## Assumptions

1. **Firo node wallet is unlocked.** Spark operations (`listsparkmints`, `spendspark`, etc.) require an unlocked wallet. The operator must ensure the wallet stays unlocked or implement an unlock mechanism.

2. **`getnewsparkaddress` returns unique addresses.** Each call is expected to return a fresh, unused Spark address. If the Firo node returns the same address for consecutive calls (as noted in some documentation), we may need to use the diversifier index to force uniqueness.

3. **InstantLock is reliable for finality.** We treat `instantlock: true` as final. No double-spend protection beyond this is implemented.

4. **Transaction memo field is usable.** We rely on the memo field in Spark transactions for player identification. If the memo field is not reliably transmitted or has size limitations, we need an alternative identification mechanism.

5. **The Firo node handles 31 address watches without performance issues.** With only 31 addresses per race (62/day), this should be well within limits.

6. **`resolvesparkname` is available as an RPC method.** This needs to be confirmed with the actual Firo node version. If not available via RPC, an alternative resolution mechanism (e.g., querying the blockchain directly) would be needed.

## Risks

1. **Player identification via memo is fragile.** If players send from wallets that don't support setting memo fields, their transactions cannot be attributed. Mitigation: the frontend provides explicit transaction instructions with memo pre-filled. Unidentified backing transactions are still recorded but cannot be paid out.

2. **Wallet balance depletion.** If the treasury or reserve is drained by an unexpected volume of payouts, the settlement engine will fail. Mitigation: the admin dashboard shows wallet balance; settlement is triggered manually with a balance check.

3. **Firo node restart.** If the Firo node restarts during a race, the Chain Watcher will miss transactions until it comes back online. Mitigation: on reconnect, the Chain Watcher re-scans all mints and processes any it missed.

4. **Address reuse across races.** Addresses are unique per race. But if a user mistakenly sends to an old race's address, the funds are received by the wallet but not attributed to any active race. These would need manual admin resolution.

5. **Network fee impact on payouts.** `spendspark` incurs a network fee. For small payouts, the fee may be a significant percentage. Mitigation: use `subtractfee: true` for small payouts, or batch payouts to share the fee cost. Define a minimum payout threshold (e.g., 0.01 FIRO); amounts below this are swept to treasury.
