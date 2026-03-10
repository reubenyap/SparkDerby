import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { FiroRpcService } from './firo-rpc.service';
import { RedisService } from '../../config/redis.config';

@Injectable()
export class ChainWatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChainWatcherService.name);
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    private readonly firoRpc: FiroRpcService,
    private readonly redis: RedisService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.warn('Chain watcher starting in MOCK mode - no real polling');
    // In production, this would start polling every 5 seconds
    // this.pollInterval = setInterval(() => this.poll(), 5000);
    this.logger.log('Chain watcher initialized (mock - not polling)');
  }

  onModuleDestroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.logger.log('Chain watcher stopped');
  }

  async poll(): Promise<void> {
    if (this.running) return;
    this.running = true;

    try {
      const lockAcquired = await this.redis.setNX('chain_watcher:lock', '1', 10);
      if (!lockAcquired) {
        this.logger.debug('Another instance holds the chain watcher lock');
        return;
      }

      const mints = await this.firoRpc.listSparkMints();
      this.logger.debug(`Polled ${mints.length} spark mints`);

      // TODO: Process new mints through intent parser
      // For each mint:
      // 1. Check if already processed (idempotency)
      // 2. Verify InstantLock status
      // 3. Resolve address to intent
      // 4. Route to backing or action handler

    } finally {
      this.running = false;
      await this.redis.del('chain_watcher:lock');
    }
  }

  isRunning(): boolean {
    return this.running;
  }
}
