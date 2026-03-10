import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FiroAdapter } from '@sparkderby/shared';
import { MockFiroAdapter } from './adapters/mock-firo.adapter';
import { JsonRpcFiroAdapter, JsonRpcConfig } from './adapters/jsonrpc-firo.adapter';

export const FIRO_ADAPTER = Symbol('FIRO_ADAPTER');

/**
 * FiroRpcService – factory/wrapper that creates the correct FiroAdapter
 * based on configuration and exposes it to the rest of the application.
 *
 * When FIRO_RPC_HOST is empty or set to 'mock', uses MockFiroAdapter.
 * Otherwise creates a JsonRpcFiroAdapter pointing at the real daemon.
 */
@Injectable()
export class FiroRpcService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FiroRpcService.name);
  private _adapter!: FiroAdapter;

  constructor(private readonly configService: ConfigService) {}

  /** The active adapter instance */
  get adapter(): FiroAdapter {
    return this._adapter;
  }

  async onModuleInit(): Promise<void> {
    const host = this.configService.get<string>('firo.rpcHost', '');
    const useMock = !host || host === 'mock' || host === '127.0.0.1';

    if (useMock && !this.configService.get<string>('FIRO_FORCE_REAL')) {
      this._adapter = new MockFiroAdapter();
      this.logger.warn(`Using MockFiroAdapter (host="${host}")`);
    } else {
      const config: JsonRpcConfig = {
        host,
        port: this.configService.get<number>('firo.rpcPort', 8888),
        user: this.configService.get<string>('firo.rpcUser', 'firouser'),
        password: this.configService.get<string>('firo.rpcPassword', 'firopass'),
        timeout: this.configService.get<number>('firo.rpcTimeout', 30000),
      };
      this._adapter = new JsonRpcFiroAdapter(config);
      this.logger.log(`Using JsonRpcFiroAdapter → ${host}:${config.port}`);
    }

    await this._adapter.connect();
    const alive = await this._adapter.ping();
    this.logger.log(`Firo adapter "${this._adapter.name}" connected, ping=${alive}`);
  }

  async onModuleDestroy(): Promise<void> {
    if (this._adapter) {
      await this._adapter.disconnect();
    }
  }

  /* ── Convenience pass-through methods for backward compatibility ───── */

  async ping(): Promise<boolean> {
    return this._adapter.ping();
  }

  async getBlockchainInfo() {
    return this._adapter.getBlockchainInfo();
  }

  async getBlockHash(height: number) {
    return this._adapter.getBlockHash(height);
  }

  async getNewSparkAddress(memo?: string) {
    return this._adapter.getNewSparkAddress(memo);
  }

  async listSparkMints(includeUsed = false) {
    return this._adapter.listSparkMints(includeUsed);
  }

  async listUnspentSparkMints() {
    return this._adapter.listUnspentSparkMints();
  }

  async getTransaction(txid: string) {
    return this._adapter.getTransaction(txid);
  }

  async getSparkBalance() {
    return this._adapter.getSparkBalance();
  }

  async spendSpark(params: { outputs: Array<{ address: string; amount: number; memo?: string }> }) {
    return this._adapter.spendSpark(params.outputs);
  }

  async resolveSparkName(name: string) {
    return this._adapter.resolveSparkName(name);
  }
}
