# Firo Integration Layer – Phase 4

## Architecture Overview

The Firo integration layer connects Spark Rush to the Firo blockchain using a
**server-side adapter pattern**. There are no browser wallets, no MetaMask,
no WalletConnect, and no smart contracts. The API server holds wallet access
and performs all on-chain operations through its daemon connection.

```
┌─────────────┐        ┌──────────────────┐        ┌──────────────┐
│  FiroModule  │───────▶│  FiroRpcService   │───────▶│  FiroAdapter  │
│  (NestJS)    │        │  (factory/wrapper)│        │  (interface)  │
└─────────────┘        └──────────────────┘        └──────┬───────┘
                                                          │
                                            ┌─────────────┴─────────────┐
                                            │                           │
                                   ┌────────▼────────┐       ┌─────────▼─────────┐
                                   │ MockFiroAdapter  │       │ JsonRpcFiroAdapter │
                                   │ (dev / test)     │       │ (production)       │
                                   └─────────────────┘       └───────────────────┘
                                                                       │
                                                                       ▼
                                                              ┌─────────────────┐
                                                              │  Firo Daemon    │
                                                              │  (JSON-RPC)     │
                                                              └─────────────────┘
```

## FiroAdapter Interface

Defined in `packages/shared/src/types/firo-adapter.ts`. Every adapter must implement:

| Method                  | Description                                         |
| ----------------------- | --------------------------------------------------- |
| `connect()`             | Establish connection to the backend                 |
| `disconnect()`          | Clean shutdown                                      |
| `ping()`                | Health check                                        |
| `getBlockchainInfo()`   | Current block height, hash, chain name              |
| `getNewSparkAddress()`  | Generate a fresh Spark address with optional memo   |
| `validateSparkAddress()`| Verify a Spark address is well-formed               |
| `resolveSparkName()`    | Resolve a `.spark` human-readable name to address   |
| `getSparkBalance()`     | Available and pending wallet balance                |
| `getTransaction()`      | Fetch transaction details by txid                   |
| `listSparkMints()`      | List all Spark mints (inbound transactions)         |
| `getInstantLockStatus()`| Check InstantSend lock status for a txid            |
| `spendSpark()`          | Send FIRO to one or more Spark addresses            |
| `sendPayout()`          | Send a single payout with race metadata             |
| `sendBatchPayout()`     | Batch multiple payouts into a single transaction    |

## Adapter Selection

`FiroRpcService` auto-selects the adapter at startup:

- **MockFiroAdapter** when `FIRO_RPC_HOST` is empty, `"mock"`, or `"127.0.0.1"` (and `FIRO_FORCE_REAL` is not set)
- **JsonRpcFiroAdapter** otherwise — connects to the real Firo daemon

Access the adapter via `firoRpcService.adapter`.

## Chain Watcher

`ChainWatcherService` polls the Firo daemon every 5 seconds:

```
poll() {
  1. Acquire Redis distributed lock (10s TTL)
  2. listSparkMints() from the adapter
  3. Deduplicate against onchain_events table
  4. For each new mint:
     a. Emit 'chain.tx.detected' event
     b. Classify via TxClassifierService
     c. Emit 'chain.tx.classified' event
     d. Persist to onchain_events table
     e. Start InstantLock monitoring in background
  5. Update last processed block height in Redis
  6. Release lock
}
```

**Key behaviors:**

- **Distributed lock**: Only one API instance polls at a time (Redis `SETNX`)
- **Idempotent**: Deduplicates by `(txid, sparkAddress)` against the DB
- **Mock-safe**: Polling is disabled when MockFiroAdapter is active
- **Event-driven**: Downstream services listen to emitted events

## Transaction Classification

`TxClassifierService` maps inbound transactions to race actions:

1. **Address lookup** — The mint's `sparkAddress` is resolved via `AddressManagerService`
   to an `AddressIntent` (raceId + racerId + intentType). If intent is `"back"`,
   it's classified as a backing. Otherwise it's classified as an action
   (boost, emp, oil_slick, overclock, black_swan).

2. **Memo fallback** — Memos starting with `treasury:`, `reserve:`, or `payout:`
   are classified into their respective categories.

3. **Unknown** — Unrecognized transactions are logged and tagged `"unknown"`.

## Address-Encoded Intent

Each race generates `racers × 6` unique Spark addresses (one per intent type):

```
Address ──resolves──▶ { raceId, racerId, intent: "back" | "boost" | ... }
```

- Generated by `AddressManagerService.generateRaceAddresses()`
- Cached in Redis (`addr:<address>` key, 13h TTL)
- Persisted to `race_addresses` table for cache-miss recovery
- Players send FIRO to the address matching their desired action
- No metadata in the transaction itself — intent is fully encoded in the address

## InstantLock Recognition

`InstantLockService` monitors transactions for Firo's InstantSend confirmation:

- Polls `getInstantLockStatus()` every 1 second (up to 30 attempts)
- Emits `firo.instantlock.confirmed` when locked
- Emits `firo.instantlock.failed` on timeout
- Background monitoring via `monitorInBackground()` — non-blocking

InstantSend locks transactions in ~2 seconds, enabling near-instant race actions
without waiting for block confirmations.

## Payout Sending

`PayoutService.executePayouts()` handles post-race settlement:

1. Batch winner payouts into a single `sendBatchPayout()` call
2. Send treasury split to `TREASURY_SPARK_ADDRESS`
3. Send reserve split to `RESERVE_SPARK_ADDRESS`
4. Record all transactions as `onchain_events` (direction: "out")
5. Monitor InstantLock for each payout txid
6. Emit `firo.payout.batch_complete` or `firo.payout.failed`

## Reconciliation

`ReconciliationService` verifies on-chain state matches expectations:

- `reconcileRace(adapter, raceId)` — compares every `onchain_events` record
  for a race against live chain data
- Updates confirmation counts, InstantLock status, and block hashes
- Produces a `ReconciliationReport` with per-entry discrepancies
- Emits `firo.reconciliation.complete` (balanced) or `firo.reconciliation.discrepancy`
- `refreshConfirmations()` — background job to update all unconfirmed events

## Spark Name Support

Players can use human-readable `.spark` names instead of raw addresses:

```typescript
const resolution = await adapter.resolveSparkName('alice.spark');
// { name: 'alice.spark', address: 'sm1...', resolved: true }
```

Resolution goes through the Firo daemon's `resolvesparkname` RPC call.
The mock adapter resolves any `.spark` name to a deterministic mock address.

## Event Flow Summary

```
[Firo Daemon]
     │
     ▼  listSparkMints()
[ChainWatcherService]
     │
     ├──▶ chain.tx.detected
     │
     ▼  classify()
[TxClassifierService]
     │
     ├──▶ chain.tx.classified { kind: 'backing' | 'action' | ... }
     │
     ▼  monitorInBackground()
[InstantLockService]
     │
     ├──▶ firo.instantlock.confirmed
     │
     ▼  (after race ends)
[PayoutService]
     │
     ├──▶ firo.payout.batch_complete
     │
     ▼
[ReconciliationService]
     │
     └──▶ firo.reconciliation.complete
```

## File Map

```
packages/shared/src/types/firo-adapter.ts     FiroAdapter interface + all types
apps/api/src/modules/firo/
├── adapters/
│   ├── index.ts                               Barrel export
│   ├── mock-firo.adapter.ts                   MockFiroAdapter
│   └── jsonrpc-firo.adapter.ts                JsonRpcFiroAdapter
├── firo.module.ts                             NestJS module
├── firo-rpc.service.ts                        Adapter factory + backward-compat wrapper
├── chain-watcher.service.ts                   Blockchain polling + event emission
├── address-manager.service.ts                 Race address generation + intent resolution
├── tx-classifier.service.ts                   Transaction → race action classification
├── instantlock.service.ts                     InstantSend lock monitoring
├── payout.service.ts                          Winner payout execution
└── reconciliation.service.ts                  On-chain vs DB reconciliation
```
