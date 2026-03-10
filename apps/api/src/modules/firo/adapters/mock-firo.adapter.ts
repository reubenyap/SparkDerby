import { Logger } from '@nestjs/common';
import {
  FiroAdapter,
  SparkAddress,
  SparkName,
  SparkNameResolution,
  SparkMintInfo,
  SparkTransactionInfo,
  SparkSpendOutput,
  SparkSpendResult,
  SparkBalanceInfo,
  BlockchainInfo,
  InstantLockStatus,
  PayoutRequest,
  PayoutResult,
} from '@sparkderby/shared';

/**
 * MockFiroAdapter – used in development & test environments.
 * All operations are in-memory; no real blockchain interaction.
 */
export class MockFiroAdapter implements FiroAdapter {
  readonly name = 'mock';
  private readonly logger = new Logger(MockFiroAdapter.name);
  private blockHeight = 500_000;
  private balance = 100.0;
  private connected = false;

  // In-memory ledger of simulated transactions
  private readonly pendingMints: SparkMintInfo[] = [];
  private readonly sentTxids: string[] = [];

  /* ── Lifecycle ──────────────────────────────────────────────────────── */

  async connect(): Promise<void> {
    this.connected = true;
    this.logger.warn('MockFiroAdapter connected (no real node)');
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.logger.log('MockFiroAdapter disconnected');
  }

  async ping(): Promise<boolean> {
    return this.connected;
  }

  /* ── Blockchain info ────────────────────────────────────────────────── */

  async getBlockchainInfo(): Promise<BlockchainInfo> {
    this.blockHeight++;
    return {
      blocks: this.blockHeight,
      bestBlockHash: this.mockHash(),
      chain: 'mock',
    };
  }

  async getBlockHash(_height: number): Promise<string> {
    return this.mockHash();
  }

  /* ── Address management ─────────────────────────────────────────────── */

  async getNewSparkAddress(memo?: string): Promise<SparkAddress> {
    const addr = 'sm1mock' + this.mockHex(40);
    this.logger.debug(`Generated mock address${memo ? ` memo=${memo}` : ''}: ${addr}`);
    return addr;
  }

  async validateSparkAddress(address: string): Promise<boolean> {
    return address.startsWith('sm1') && address.length >= 20;
  }

  /* ── Spark Name resolution ──────────────────────────────────────────── */

  async resolveSparkName(name: SparkName): Promise<SparkNameResolution> {
    // Mock: names ending with .spark resolve to a deterministic address
    if (name.endsWith('.spark')) {
      return {
        name,
        address: 'sm1mock' + this.mockHex(40),
        resolved: true,
      };
    }
    return { name, address: null, resolved: false };
  }

  /* ── Balance ────────────────────────────────────────────────────────── */

  async getSparkBalance(): Promise<SparkBalanceInfo> {
    return { available: this.balance, pending: 0 };
  }

  /* ── Transactions ───────────────────────────────────────────────────── */

  async getTransaction(txid: string): Promise<SparkTransactionInfo> {
    return {
      txid,
      amount: 1.0,
      confirmations: 6,
      instantLock: true,
      blockHash: this.mockHash(),
      blockHeight: this.blockHeight,
      time: Math.floor(Date.now() / 1000),
    };
  }

  async listSparkMints(_includeUsed = false): Promise<SparkMintInfo[]> {
    return [...this.pendingMints];
  }

  async listUnspentSparkMints(): Promise<SparkMintInfo[]> {
    return [...this.pendingMints];
  }

  /* ── InstantLock ────────────────────────────────────────────────────── */

  async getInstantLockStatus(_txid: string): Promise<InstantLockStatus> {
    return 'locked'; // mock always instant-locks
  }

  /* ── Sending ────────────────────────────────────────────────────────── */

  async spendSpark(outputs: SparkSpendOutput[]): Promise<SparkSpendResult> {
    const total = outputs.reduce((s, o) => s + o.amount, 0);
    if (total > this.balance) {
      throw new Error(`MockFiroAdapter: insufficient balance (need ${total}, have ${this.balance})`);
    }
    this.balance -= total;
    const txid = this.mockHash();
    this.sentTxids.push(txid);
    this.logger.log(`Mock spendSpark: ${outputs.length} outputs, total=${total} FIRO, txid=${txid}`);
    return { txid };
  }

  async sendPayout(request: PayoutRequest): Promise<PayoutResult> {
    const results = await this.sendBatchPayout([request]);
    return results[0];
  }

  async sendBatchPayout(requests: PayoutRequest[]): Promise<PayoutResult[]> {
    const results: PayoutResult[] = [];
    for (const req of requests) {
      if (req.amount > this.balance) {
        results.push({
          txid: '',
          recipientAddress: req.recipientAddress,
          amount: req.amount,
          success: false,
          error: 'Insufficient mock balance',
        });
        continue;
      }
      this.balance -= req.amount;
      const txid = this.mockHash();
      this.sentTxids.push(txid);
      results.push({
        txid,
        recipientAddress: req.recipientAddress,
        amount: req.amount,
        success: true,
      });
    }
    this.logger.log(`Mock batch payout: ${results.filter(r => r.success).length}/${requests.length} succeeded`);
    return results;
  }

  /* ── Test helpers (not part of FiroAdapter interface) ────────────────── */

  /** Simulate an inbound Spark mint for testing */
  simulateInboundMint(mint: SparkMintInfo): void {
    this.pendingMints.push(mint);
  }

  /** Set the mock wallet balance */
  setBalance(amount: number): void {
    this.balance = amount;
  }

  /* ── Private ────────────────────────────────────────────────────────── */

  private mockHash(): string {
    return this.mockHex(64);
  }

  private mockHex(len: number): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < len; i++) {
      result += chars[Math.floor(Math.random() * 16)];
    }
    return result;
  }
}
