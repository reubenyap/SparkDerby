import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InstantLockStatus, FiroAdapter } from '@sparkderby/shared';

/* ── Events emitted by InstantLockService ─────────────────────────────── */

export const INSTANTLOCK_CONFIRMED = 'firo.instantlock.confirmed';
export const INSTANTLOCK_FAILED = 'firo.instantlock.failed';

export interface InstantLockEvent {
  txid: string;
  status: InstantLockStatus;
  checkedAt: number; // unix ms
}

/**
 * InstantLockService – polls a transaction's InstantSend / InstantLock
 * status until it resolves, then fires an event.
 *
 * Firo's InstantSend locks transactions within ~2 seconds. This service
 * provides the hook layer so the chain watcher can act on lock confirmation
 * without blocking the poll loop.
 */
@Injectable()
export class InstantLockService {
  private readonly logger = new Logger(InstantLockService.name);
  private readonly pending = new Map<string, { attempts: number; maxAttempts: number }>();

  private static readonly CHECK_INTERVAL_MS = 1_000;
  private static readonly DEFAULT_MAX_ATTEMPTS = 30; // ~30 seconds

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Begin monitoring a txid for InstantLock status.
   * Resolves once the lock is confirmed or max attempts reached.
   */
  async waitForLock(
    adapter: FiroAdapter,
    txid: string,
    maxAttempts = InstantLockService.DEFAULT_MAX_ATTEMPTS,
  ): Promise<InstantLockStatus> {
    this.pending.set(txid, { attempts: 0, maxAttempts });

    let status: InstantLockStatus = 'unknown';
    const entry = this.pending.get(txid)!;

    while (entry.attempts < entry.maxAttempts) {
      entry.attempts++;
      status = await adapter.getInstantLockStatus(txid);

      if (status === 'locked') {
        this.pending.delete(txid);
        this.eventEmitter.emit(INSTANTLOCK_CONFIRMED, {
          txid,
          status,
          checkedAt: Date.now(),
        } satisfies InstantLockEvent);
        this.logger.debug(`InstantLock confirmed for ${txid} after ${entry.attempts} checks`);
        return status;
      }

      if (status === 'not_locked') {
        // Not yet locked – keep waiting
        await this.sleep(InstantLockService.CHECK_INTERVAL_MS);
        continue;
      }

      // 'unknown' – tx might not exist yet, keep trying
      await this.sleep(InstantLockService.CHECK_INTERVAL_MS);
    }

    // Timed out
    this.pending.delete(txid);
    this.eventEmitter.emit(INSTANTLOCK_FAILED, {
      txid,
      status,
      checkedAt: Date.now(),
    } satisfies InstantLockEvent);
    this.logger.warn(`InstantLock timed out for ${txid} after ${maxAttempts} attempts`);
    return status;
  }

  /** Fire-and-forget version for background monitoring */
  monitorInBackground(adapter: FiroAdapter, txid: string): void {
    this.waitForLock(adapter, txid).catch(err => {
      this.logger.error(`InstantLock monitor error for ${txid}: ${err}`);
    });
  }

  /** How many txids are currently being monitored */
  get pendingCount(): number {
    return this.pending.size;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
