import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface SparkMint {
  txid: string;
  amount: number;
  sparkAddress: string;
  memo: string;
  confirmations: number;
  blockHash?: string;
  blockHeight?: number;
}

interface SparkTransaction {
  txid: string;
  amount: number;
  confirmations: number;
  instantlock: boolean;
  blockhash?: string;
  blockheight?: number;
  time: number;
}

interface SpendSparkParams {
  outputs: Array<{
    address: string;
    amount: number;
    memo?: string;
  }>;
}

@Injectable()
export class FiroRpcService implements OnModuleInit {
  private readonly logger = new Logger(FiroRpcService.name);
  private mockBlockHeight = 500000;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    this.logger.warn('Running with MOCK Firo RPC adapter');
    const host = this.configService.get<string>('firo.rpcHost');
    const port = this.configService.get<number>('firo.rpcPort');
    this.logger.log(`Mock Firo RPC configured for ${host}:${port}`);
  }

  async ping(): Promise<boolean> {
    this.logger.debug('Mock ping');
    return true;
  }

  async getBlockchainInfo(): Promise<{ blocks: number; bestblockhash: string }> {
    this.mockBlockHeight++;
    return {
      blocks: this.mockBlockHeight,
      bestblockhash: this.generateMockHash(),
    };
  }

  async getBlockHash(height: number): Promise<string> {
    return this.generateMockHash();
  }

  async getNewSparkAddress(_memo?: string): Promise<string> {
    const chars = '0123456789abcdef';
    let addr = 'sm1mock';
    for (let i = 0; i < 40; i++) {
      addr += chars[Math.floor(Math.random() * chars.length)];
    }
    return addr;
  }

  async listSparkMints(_includeUsed = false): Promise<SparkMint[]> {
    // Mock returns empty - no real transactions in dev
    return [];
  }

  async listUnspentSparkMints(): Promise<SparkMint[]> {
    return [];
  }

  async getTransaction(txid: string): Promise<SparkTransaction> {
    return {
      txid,
      amount: 1.0,
      confirmations: 6,
      instantlock: true,
      blockhash: this.generateMockHash(),
      blockheight: this.mockBlockHeight,
      time: Math.floor(Date.now() / 1000),
    };
  }

  async getSparkBalance(): Promise<{ available: number; pending: number }> {
    return { available: 100.0, pending: 0.0 };
  }

  async spendSpark(params: SpendSparkParams): Promise<{ txid: string }> {
    const totalOut = params.outputs.reduce((sum, o) => sum + o.amount, 0);
    this.logger.log(`Mock spendSpark: ${params.outputs.length} outputs, total: ${totalOut} FIRO`);
    return { txid: this.generateMockHash() };
  }

  async resolveSparkName(name: string): Promise<string | null> {
    this.logger.debug(`Mock resolveSparkName: ${name}`);
    return null;
  }

  private generateMockHash(): string {
    const chars = '0123456789abcdef';
    let hash = '';
    for (let i = 0; i < 64; i++) {
      hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
  }
}
