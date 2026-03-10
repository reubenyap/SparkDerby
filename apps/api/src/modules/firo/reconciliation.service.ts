import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  FiroAdapter,
  ReconciliationEntry,
  ReconciliationReport,
} from '@sparkderby/shared';
import { OnchainEventEntity } from '../onchain/entities/onchain-event.entity';

/* ── Events ──────────────────────────────────────────────────────────── */

export const RECONCILIATION_COMPLETE = 'firo.reconciliation.complete';
export const RECONCILIATION_DISCREPANCY = 'firo.reconciliation.discrepancy';

/**
 * ReconciliationService – compares the expected on-chain state (from our DB)
 * against actual chain data to detect discrepancies.
 *
 * Runs after settlement completes. If balances don't match, emits a
 * discrepancy event for operators to investigate.
 */
@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    @InjectRepository(OnchainEventEntity)
    private readonly onchainRepo: Repository<OnchainEventEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Reconcile all on-chain events for a given race against the live chain.
   */
  async reconcileRace(
    adapter: FiroAdapter,
    raceId: string,
  ): Promise<ReconciliationReport> {
    this.logger.log(`Starting reconciliation for race ${raceId}`);

    // Fetch all on-chain events we recorded for this race
    const events = await this.onchainRepo.find({
      where: { raceId },
      order: { createdAt: 'ASC' },
    });

    const entries: ReconciliationEntry[] = [];
    let totalExpected = 0;
    let totalActual = 0;

    for (const event of events) {
      const expected = parseFloat(event.amount);
      let actual = 0;

      try {
        if (event.txid && event.txid !== 'failed') {
          const tx = await adapter.getTransaction(event.txid);
          actual = Math.abs(tx.amount);

          // Also update InstantLock and confirmation status
          if (tx.instantLock && !event.instantLocked) {
            await this.onchainRepo.update(event.id, {
              instantLocked: true,
              status: 'instant_locked',
            });
          }
          if (tx.confirmations >= 6 && event.status !== 'confirmed') {
            await this.onchainRepo.update(event.id, {
              status: 'confirmed',
              confirmedAt: new Date(),
              blockHash: tx.blockHash || null,
              blockHeight: tx.blockHeight || null,
            });
          }
        }
      } catch (err) {
        this.logger.warn(`Cannot fetch tx ${event.txid}: ${err}`);
      }

      const discrepancy = Math.abs(expected - actual);
      totalExpected += expected;
      totalActual += actual;

      entries.push({
        txid: event.txid,
        expected,
        actual,
        sparkAddress: event.sparkAddress,
        purpose: event.purpose as ReconciliationEntry['purpose'],
        status: event.status as ReconciliationEntry['status'],
        discrepancy,
      });
    }

    const balanced = Math.abs(totalExpected - totalActual) < 0.00000001; // 1 satoshi tolerance
    const report: ReconciliationReport = {
      raceId,
      entries,
      totalExpected,
      totalActual,
      balanced,
      generatedAt: Date.now(),
    };

    if (balanced) {
      this.eventEmitter.emit(RECONCILIATION_COMPLETE, report);
      this.logger.log(`Reconciliation OK for race ${raceId}: ${entries.length} events balanced`);
    } else {
      this.eventEmitter.emit(RECONCILIATION_DISCREPANCY, report);
      this.logger.warn(
        `Reconciliation DISCREPANCY for race ${raceId}: ` +
        `expected=${totalExpected}, actual=${totalActual}, diff=${Math.abs(totalExpected - totalActual)}`,
      );
    }

    return report;
  }

  /**
   * Update confirmation status for all unconfirmed events (background job).
   */
  async refreshConfirmations(adapter: FiroAdapter): Promise<number> {
    const unconfirmed = await this.onchainRepo.find({
      where: [
        { status: 'detected' },
        { status: 'instant_locked' },
      ],
    });

    let updated = 0;
    for (const event of unconfirmed) {
      try {
        if (!event.txid || event.txid === 'failed') continue;
        const tx = await adapter.getTransaction(event.txid);

        const updates: Partial<OnchainEventEntity> = {};

        if (tx.instantLock && !event.instantLocked) {
          updates.instantLocked = true;
          if (event.status === 'detected') {
            updates.status = 'instant_locked';
          }
        }

        if (tx.confirmations >= 6) {
          updates.status = 'confirmed';
          updates.confirmedAt = new Date();
          updates.blockHash = tx.blockHash || null;
          updates.blockHeight = tx.blockHeight || null;
        }

        if (Object.keys(updates).length > 0) {
          await this.onchainRepo.update(event.id, updates);
          updated++;
        }
      } catch {
        // tx might not be found yet, skip
      }
    }

    if (updated > 0) {
      this.logger.log(`Refreshed ${updated} confirmation statuses`);
    }
    return updated;
  }
}
