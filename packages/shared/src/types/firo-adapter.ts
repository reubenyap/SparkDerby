// ---------------------------------------------------------------------------
// FiroAdapter – portable interface for all Firo / Spark blockchain operations
// ---------------------------------------------------------------------------
// Implementations: MockFiroAdapter (dev/test), JsonRpcFiroAdapter (production)
// No MetaMask, no WalletConnect, no smart contracts, no browser wallet injection.
// ---------------------------------------------------------------------------

import { EventStatus, EventPurpose } from './firo';
import { IntentType } from './action';

/* ── Spark address & name ────────────────────────────────────────────── */

/** A raw Spark address string (sm1…) */
export type SparkAddress = string;

/** A Spark Name (.spark human-readable name) */
export type SparkName = string;

/** Result of resolving a Spark Name */
export interface SparkNameResolution {
  name: SparkName;
  address: SparkAddress | null;
  resolved: boolean;
}

/* ── Transactions ────────────────────────────────────────────────────── */

export interface SparkMintInfo {
  txid: string;
  amount: number;
  sparkAddress: SparkAddress;
  memo: string;
  confirmations: number;
  blockHash?: string;
  blockHeight?: number;
}

export interface SparkTransactionInfo {
  txid: string;
  amount: number;
  confirmations: number;
  instantLock: boolean;
  blockHash?: string;
  blockHeight?: number;
  time: number;
}

export interface SparkSpendOutput {
  address: SparkAddress;
  amount: number;
  memo?: string;
}

export interface SparkSpendResult {
  txid: string;
}

export interface BlockchainInfo {
  blocks: number;
  bestBlockHash: string;
  chain: string;
}

export interface SparkBalanceInfo {
  available: number;
  pending: number;
}

/* ── Race address intent encoding ────────────────────────────────────── */

export interface AddressIntent {
  raceId: string;
  racerId: string;
  intent: IntentType;
}

/* ── Transaction classification ──────────────────────────────────────── */

export type TxClassification =
  | { kind: 'backing';    raceId: string; racerId: string; amount: number }
  | { kind: 'action';     raceId: string; racerId: string; actionType: Exclude<IntentType, 'back'>; amount: number }
  | { kind: 'payout';     raceId: string; playerId: string; amount: number }
  | { kind: 'treasury';   amount: number }
  | { kind: 'reserve';    amount: number }
  | { kind: 'unknown';    txid: string };

/* ── Watcher events ──────────────────────────────────────────────────── */

export interface WatchedTransaction {
  txid: string;
  voutIndex: number | null;
  sparkAddress: SparkAddress;
  amount: number;
  memo: string;
  confirmations: number;
  instantLock: boolean;
  blockHash?: string;
  blockHeight?: number;
  detectedAt: number; // unix ms
}

export type InstantLockStatus = 'locked' | 'not_locked' | 'unknown';

/* ── Reconciliation ──────────────────────────────────────────────────── */

export interface ReconciliationEntry {
  txid: string;
  expected: number;
  actual: number;
  sparkAddress: SparkAddress;
  purpose: EventPurpose;
  status: EventStatus;
  discrepancy: number;
}

export interface ReconciliationReport {
  raceId: string;
  entries: ReconciliationEntry[];
  totalExpected: number;
  totalActual: number;
  balanced: boolean;
  generatedAt: number; // unix ms
}

/* ── Payout request ──────────────────────────────────────────────────── */

export interface PayoutRequest {
  recipientAddress: SparkAddress;
  amount: number;
  memo?: string;
  raceId: string;
  playerId: string;
  place: number;
}

export interface PayoutResult {
  txid: string;
  recipientAddress: SparkAddress;
  amount: number;
  success: boolean;
  error?: string;
}

/* ── The adapter interface ───────────────────────────────────────────── */

export interface FiroAdapter {
  readonly name: string;

  // Lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  ping(): Promise<boolean>;

  // Blockchain info
  getBlockchainInfo(): Promise<BlockchainInfo>;
  getBlockHash(height: number): Promise<string>;

  // Spark address management
  getNewSparkAddress(memo?: string): Promise<SparkAddress>;
  validateSparkAddress(address: string): Promise<boolean>;

  // Spark Name resolution
  resolveSparkName(name: SparkName): Promise<SparkNameResolution>;

  // Balance
  getSparkBalance(): Promise<SparkBalanceInfo>;

  // Transactions
  getTransaction(txid: string): Promise<SparkTransactionInfo>;
  listSparkMints(includeUsed?: boolean): Promise<SparkMintInfo[]>;
  listUnspentSparkMints(): Promise<SparkMintInfo[]>;

  // InstantLock
  getInstantLockStatus(txid: string): Promise<InstantLockStatus>;

  // Sending
  spendSpark(outputs: SparkSpendOutput[]): Promise<SparkSpendResult>;
  sendPayout(request: PayoutRequest): Promise<PayoutResult>;
  sendBatchPayout(requests: PayoutRequest[]): Promise<PayoutResult[]>;
}
