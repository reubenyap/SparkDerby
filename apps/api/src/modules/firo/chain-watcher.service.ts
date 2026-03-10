import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FiroRpcService } from './firo-rpc.service';
import { TxClassifierService } from './tx-classifier.service';
import { InstantLockService } from './instantlock.service';
import { RedisService } from '../../config/redis.config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnchainEventEntity } from '../onchain/entities/onchain-event.entity';
import { WatchedTransaction, TxClassification } from '@sparkderby/shared';

/* ── Events ──────────────────────────────────────────────────────────── */

export const CHAIN_TX_DETECTED = 'chain.tx.detected';
export const CHAIN_TX_CLASSIFIED = 'chain.tx.classified';
export const CHAIN_POLL_COMPLETE = 'chain.poll.complete';

export interface ChainTxDetectedEvent {
  tx: WatchedTransaction;
}

export interface ChainTxClassifiedEvent {
  tx: WatchedTransaction;
  classification: TxClassification;
}

/**
 * ChainWatcherService – polls the Firo daemon for new Spark mints,
 * classifies them, checks InstantLock status, and persists on-chain events.
 *
 * Only one instance should poll at a time (enforced by Redis lock).
 * Poll interval is configurable; defaults to 5 seconds.
 */
@Injectable()
export class ChainWatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChainWatcherService.name);
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  private static readonly POLL_INTERVAL_MS = 5_000;
  private static readonly LOCK_TTL_SECONDS = 10;
  private static readonly LOCK_KEY = 'chain_watcher:lock';
  private static readonly LAST_HEIGHT_KEY = 'chain_watcher:last_height';

  constructor(
    private readonly firoRpc: FiroRpcService,
    private readonly classifier: TxClassifierService,
    private readonly instantLock: InstantLockService,
    private readonly redis: RedisService,
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(OnchainEventEntity)
    private readonly onchainRepo: Repository<OnchainEventEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    const adapterName = this.firoRpc.adapter.name;
    if (adapterName === 'mock') {
      this.logger.warn('Chain watcher: mock adapter detected, polling disabled');
      return;
    }
    this.startPolling();
  }

  onModuleDestroy(): void {
    this.stopPolling();
  }

  startPolling(): void {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(
      () => this.poll(),
      ChainWatcherService.POLL_INTERVAL_MS,
    );
    this.logger.log(`Chain watcher polling every ${ChainWatcherService.POLL_INTERVAL_MS}ms`);
  }

  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.logger.log('Chain watcher stopped');
  }

  isRunning(): boolean {
    return this.running;
  }

  /**
   * Single poll cycle:
   * 1. Acquire distributed lock
   * 2. Fetch new Spark mints since last known height
   * 3. Deduplicate against already-seen txids
   * 4. Classify each transaction
   * 5. Record on-chain events
   * 6. Check InstantLock in background
   */
  async poll(): Promise<void> {
    if (this.running) return;
    this.running = true;

    let lockAcquired = false;
    try {
      // Distributed lock – only one API instance polls at a time
      lockAcquired = await this.redis.setNX(
        ChainWatcherService.LOCK_KEY,
        '1',
        ChainWatcherService.LOCK_TTL_SECONDS,
      );
      if (!lockAcquired) {
        this.logger.debug('Another instance holds the chain watcher lock');
        return;
      }

      // Fetch mints
      const mints = await this.firoRpc.adapter.listSparkMints();
      if (mints.length === 0) {
        this.eventEmitter.emit(CHAIN_POLL_COMPLETE, { mintsProcessed: 0 });
        return;
      }

      // Deduplicate: skip txids we've already recorded
      const newMints = [];
      for (const mint of mints) {
        const existing = await this.onchainRepo.findOne({
          where: { txid: mint.txid, sparkAddress: mint.sparkAddress },
        });
        if (!existing) {
          newMints.push(mint);
        }
      }

      if (newMints.length === 0) {
        this.eventEmitter.emit(CHAIN_POLL_COMPLETE, { mintsProcessed: 0 });
        return;
      }

      this.logger.log(`Processing ${newMints.length} new mints`);

      // Classify and persist
      for (const mint of newMints) {
        const watchedTx: WatchedTransaction = {
          txid: mint.txid,
          voutIndex: null,
          sparkAddress: mint.sparkAddress,
          amount: mint.amount,
          memo: mint.memo,
          confirmations: mint.confirmations,
          instantLock: false,
          blockHash: mint.blockHash,
          blockHeight: mint.blockHeight,
          detectedAt: Date.now(),
        };

        this.eventEmitter.emit(CHAIN_TX_DETECTED, { tx: watchedTx } satisfies ChainTxDetectedEvent);

        // Classify
        const classification = await this.classifier.classify(mint);
        this.eventEmitter.emit(CHAIN_TX_CLASSIFIED, {
          tx: watchedTx,
          classification,
        } satisfies ChainTxClassifiedEvent);

        // Persist on-chain event
        await this.persistEvent(watchedTx, classification);

        // Check InstantLock in background
        this.instantLock.monitorInBackground(this.firoRpc.adapter, mint.txid);
      }

      // Update last processed height
      const info = await this.firoRpc.adapter.getBlockchainInfo();
      await this.redis.set(
        ChainWatcherService.LAST_HEIGHT_KEY,
        String(info.blocks),
      );

      this.eventEmitter.emit(CHAIN_POLL_COMPLETE, { mintsProcessed: newMints.length });
    } catch (err) {
      this.logger.error(`Poll error: ${err}`);
    } finally {
      this.running = false;
      if (lockAcquired) {
        await this.redis.del(ChainWatcherService.LOCK_KEY).catch(() => {});
      }
    }
  }

  private async persistEvent(
    tx: WatchedTransaction,
    classification: TxClassification,
  ): Promise<void> {
    const entity = this.onchainRepo.create({
      txid: tx.txid,
      voutIndex: tx.voutIndex,
      sparkAddress: tx.sparkAddress,
      amount: String(tx.amount),
      direction: 'in',
      purpose: classification.kind === 'unknown' ? null : classification.kind,
      raceId: 'raceId' in classification ? classification.raceId : null,
      playerId: 'playerId' in classification ? classification.playerId : null,
      status: tx.instantLock ? 'instant_locked' : 'detected',
      instantLocked: tx.instantLock,
      blockHash: tx.blockHash || null,
      blockHeight: tx.blockHeight || null,
    });
    await this.onchainRepo.save(entity);
  }
}
