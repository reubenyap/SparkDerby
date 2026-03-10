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

/* ── Config ──────────────────────────────────────────────────────────── */

export interface JsonRpcConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  timeout: number;
}

/* ── JSON-RPC helpers ────────────────────────────────────────────────── */

interface RpcResponse<T = unknown> {
  result: T;
  error: { code: number; message: string } | null;
  id: string | number;
}

/**
 * JsonRpcFiroAdapter – communicates with a real Firo daemon via JSON-RPC.
 *
 * All Spark operations go through the daemon's RPC interface.
 * No browser wallets, no MetaMask, no WalletConnect.
 * The server holds wallet access and performs all on-chain operations.
 */
export class JsonRpcFiroAdapter implements FiroAdapter {
  readonly name = 'jsonrpc';
  private readonly logger = new Logger(JsonRpcFiroAdapter.name);
  private rpcUrl: string = '';
  private authHeader: string = '';
  private connected = false;

  constructor(private readonly config: JsonRpcConfig) {}

  /* ── Lifecycle ──────────────────────────────────────────────────────── */

  async connect(): Promise<void> {
    this.rpcUrl = `http://${this.config.host}:${this.config.port}`;
    this.authHeader =
      'Basic ' + Buffer.from(`${this.config.user}:${this.config.password}`).toString('base64');
    this.connected = true;
    this.logger.log(`JsonRpcFiroAdapter connected to ${this.rpcUrl}`);

    // Verify connectivity
    const ok = await this.ping();
    if (!ok) {
      this.connected = false;
      throw new Error(`Cannot reach Firo daemon at ${this.rpcUrl}`);
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.logger.log('JsonRpcFiroAdapter disconnected');
  }

  async ping(): Promise<boolean> {
    try {
      await this.call<{ blocks: number }>('getblockchaininfo');
      return true;
    } catch {
      return false;
    }
  }

  /* ── Blockchain info ────────────────────────────────────────────────── */

  async getBlockchainInfo(): Promise<BlockchainInfo> {
    const info = await this.call<{
      blocks: number;
      bestblockhash: string;
      chain: string;
    }>('getblockchaininfo');
    return {
      blocks: info.blocks,
      bestBlockHash: info.bestblockhash,
      chain: info.chain,
    };
  }

  async getBlockHash(height: number): Promise<string> {
    return this.call<string>('getblockhash', [height]);
  }

  /* ── Address management ─────────────────────────────────────────────── */

  async getNewSparkAddress(memo?: string): Promise<SparkAddress> {
    // Firo RPC: getnewsparkaddress [memo]
    const params = memo ? [memo] : [];
    return this.call<string>('getnewsparkaddress', params);
  }

  async validateSparkAddress(address: string): Promise<boolean> {
    try {
      const result = await this.call<{ isvalid: boolean }>('validatesparkaddress', [address]);
      return result.isvalid;
    } catch {
      return false;
    }
  }

  /* ── Spark Name resolution ──────────────────────────────────────────── */

  async resolveSparkName(name: SparkName): Promise<SparkNameResolution> {
    try {
      const address = await this.call<string>('resolvesparkname', [name]);
      return {
        name,
        address: address || null,
        resolved: !!address,
      };
    } catch (err) {
      this.logger.debug(`Spark Name resolution failed for "${name}": ${err}`);
      return { name, address: null, resolved: false };
    }
  }

  /* ── Balance ────────────────────────────────────────────────────────── */

  async getSparkBalance(): Promise<SparkBalanceInfo> {
    const bal = await this.call<{
      availableBalance: number;
      pendingBalance: number;
    }>('getsparkbalance');
    return {
      available: bal.availableBalance,
      pending: bal.pendingBalance,
    };
  }

  /* ── Transactions ───────────────────────────────────────────────────── */

  async getTransaction(txid: string): Promise<SparkTransactionInfo> {
    const tx = await this.call<{
      txid: string;
      amount: number;
      confirmations: number;
      instantlock: boolean;
      blockhash?: string;
      blockheight?: number;
      time: number;
    }>('gettransaction', [txid]);
    return {
      txid: tx.txid,
      amount: tx.amount,
      confirmations: tx.confirmations,
      instantLock: tx.instantlock,
      blockHash: tx.blockhash,
      blockHeight: tx.blockheight,
      time: tx.time,
    };
  }

  async listSparkMints(includeUsed = false): Promise<SparkMintInfo[]> {
    const mints = await this.call<Array<{
      txid: string;
      amount: number;
      sparkAddress: string;
      memo: string;
      confirmations: number;
      blockHash?: string;
      blockHeight?: number;
    }>>('listsparkmints', [includeUsed]);
    return mints.map(m => ({
      txid: m.txid,
      amount: m.amount,
      sparkAddress: m.sparkAddress,
      memo: m.memo,
      confirmations: m.confirmations,
      blockHash: m.blockHash,
      blockHeight: m.blockHeight,
    }));
  }

  async listUnspentSparkMints(): Promise<SparkMintInfo[]> {
    const mints = await this.call<Array<{
      txid: string;
      amount: number;
      sparkAddress: string;
      memo: string;
      confirmations: number;
      blockHash?: string;
      blockHeight?: number;
    }>>('listunspentsparkmints');
    return mints.map(m => ({
      txid: m.txid,
      amount: m.amount,
      sparkAddress: m.sparkAddress,
      memo: m.memo,
      confirmations: m.confirmations,
      blockHash: m.blockHash,
      blockHeight: m.blockHeight,
    }));
  }

  /* ── InstantLock ────────────────────────────────────────────────────── */

  async getInstantLockStatus(txid: string): Promise<InstantLockStatus> {
    try {
      const tx = await this.call<{ instantlock: boolean }>('gettransaction', [txid]);
      return tx.instantlock ? 'locked' : 'not_locked';
    } catch {
      return 'unknown';
    }
  }

  /* ── Sending ────────────────────────────────────────────────────────── */

  async spendSpark(outputs: SparkSpendOutput[]): Promise<SparkSpendResult> {
    const rpcOutputs = outputs.map(o => ({
      address: o.address,
      amount: o.amount,
      ...(o.memo ? { memo: o.memo } : {}),
    }));
    const result = await this.call<{ txid: string }>('spendspark', [{ outputs: rpcOutputs }]);
    this.logger.log(`spendSpark: ${outputs.length} outputs, txid=${result.txid}`);
    return { txid: result.txid };
  }

  async sendPayout(request: PayoutRequest): Promise<PayoutResult> {
    const results = await this.sendBatchPayout([request]);
    return results[0];
  }

  async sendBatchPayout(requests: PayoutRequest[]): Promise<PayoutResult[]> {
    // Batch into a single spendSpark call for efficiency
    const outputs: SparkSpendOutput[] = requests.map(r => ({
      address: r.recipientAddress,
      amount: r.amount,
      memo: r.memo || `payout:${r.raceId}:p${r.place}`,
    }));

    try {
      const { txid } = await this.spendSpark(outputs);
      return requests.map(r => ({
        txid,
        recipientAddress: r.recipientAddress,
        amount: r.amount,
        success: true,
      }));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Batch payout failed: ${errorMsg}`);
      return requests.map(r => ({
        txid: '',
        recipientAddress: r.recipientAddress,
        amount: r.amount,
        success: false,
        error: errorMsg,
      }));
    }
  }

  /* ── JSON-RPC transport ─────────────────────────────────────────────── */

  private async call<T>(method: string, params: unknown[] = []): Promise<T> {
    const id = Date.now();
    const body = JSON.stringify({ jsonrpc: '1.0', id, method, params });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const res = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.authHeader,
        },
        body,
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`RPC HTTP ${res.status}: ${res.statusText}`);
      }

      const json = (await res.json()) as RpcResponse<T>;
      if (json.error) {
        throw new Error(`RPC error ${json.error.code}: ${json.error.message}`);
      }
      return json.result;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
