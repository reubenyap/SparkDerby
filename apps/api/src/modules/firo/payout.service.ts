import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  FiroAdapter,
  PayoutRequest,
  PayoutResult,
  PayoutEntry,
  SparkSpendOutput,
} from '@sparkderby/shared';
import { OnchainEventEntity } from '../onchain/entities/onchain-event.entity';
import { InstantLockService } from './instantlock.service';

/* ── Events ──────────────────────────────────────────────────────────── */

export const PAYOUT_SENT = 'firo.payout.sent';
export const PAYOUT_FAILED = 'firo.payout.failed';
export const PAYOUT_BATCH_COMPLETE = 'firo.payout.batch_complete';

export interface PayoutSentEvent {
  raceId: string;
  results: PayoutResult[];
  treasuryTxid?: string;
  reserveTxid?: string;
}

/**
 * PayoutService – handles sending winnings to players after race settlement.
 *
 * All payouts go through the FiroAdapter (server-side wallet, no browser
 * wallets). Supports batched payouts, treasury/reserve splits, and
 * records every on-chain event for reconciliation.
 */
@Injectable()
export class PayoutService {
  private readonly logger = new Logger(PayoutService.name);

  constructor(
    @InjectRepository(OnchainEventEntity)
    private readonly onchainRepo: Repository<OnchainEventEntity>,
    private readonly instantLock: InstantLockService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Execute payouts for a settled race.
   *
   * @param adapter      The FiroAdapter to use for sending
   * @param raceId       The race being settled
   * @param payouts      Winner payout entries
   * @param treasuryAddr Treasury Spark address
   * @param treasuryAmt  Amount for treasury
   * @param reserveAddr  Reserve Spark address
   * @param reserveAmt   Amount for reserve
   */
  async executePayouts(
    adapter: FiroAdapter,
    raceId: string,
    payouts: PayoutEntry[],
    treasuryAddr: string,
    treasuryAmt: number,
    reserveAddr: string,
    reserveAmt: number,
  ): Promise<PayoutSentEvent> {
    this.logger.log(`Executing payouts for race ${raceId}: ${payouts.length} winners`);

    // 1. Send winner payouts (batched into single tx when possible)
    const payoutRequests: PayoutRequest[] = payouts.map(p => ({
      recipientAddress: p.sparkAddress,
      amount: p.amount,
      memo: `payout:${raceId}:p${p.place}`,
      raceId,
      playerId: p.playerId,
      place: p.place,
    }));

    const results = await adapter.sendBatchPayout(payoutRequests);

    // Record each payout as an on-chain event
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const payout = payouts[i];
      await this.recordPayoutEvent(raceId, payout, result);

      // Monitor InstantLock in background for successful payouts
      if (result.success && result.txid) {
        this.instantLock.monitorInBackground(adapter, result.txid);
      }
    }

    // 2. Send treasury split
    let treasuryTxid: string | undefined;
    if (treasuryAmt > 0 && treasuryAddr) {
      try {
        const treasuryOutputs: SparkSpendOutput[] = [
          { address: treasuryAddr, amount: treasuryAmt, memo: `treasury:${raceId}` },
        ];
        const tx = await adapter.spendSpark(treasuryOutputs);
        treasuryTxid = tx.txid;
        await this.recordSystemEvent(raceId, treasuryAddr, treasuryAmt, 'treasury', tx.txid);
        this.instantLock.monitorInBackground(adapter, tx.txid);
      } catch (err) {
        this.logger.error(`Treasury payout failed for race ${raceId}: ${err}`);
      }
    }

    // 3. Send reserve split
    let reserveTxid: string | undefined;
    if (reserveAmt > 0 && reserveAddr) {
      try {
        const reserveOutputs: SparkSpendOutput[] = [
          { address: reserveAddr, amount: reserveAmt, memo: `reserve:${raceId}` },
        ];
        const tx = await adapter.spendSpark(reserveOutputs);
        reserveTxid = tx.txid;
        await this.recordSystemEvent(raceId, reserveAddr, reserveAmt, 'reserve', tx.txid);
        this.instantLock.monitorInBackground(adapter, tx.txid);
      } catch (err) {
        this.logger.error(`Reserve payout failed for race ${raceId}: ${err}`);
      }
    }

    const event: PayoutSentEvent = { raceId, results, treasuryTxid, reserveTxid };

    const successCount = results.filter(r => r.success).length;
    if (successCount === results.length) {
      this.eventEmitter.emit(PAYOUT_BATCH_COMPLETE, event);
      this.logger.log(`All ${successCount} payouts sent for race ${raceId}`);
    } else {
      this.eventEmitter.emit(PAYOUT_FAILED, event);
      this.logger.warn(`${successCount}/${results.length} payouts succeeded for race ${raceId}`);
    }

    return event;
  }

  private async recordPayoutEvent(
    raceId: string,
    payout: PayoutEntry,
    result: PayoutResult,
  ): Promise<void> {
    const entity = this.onchainRepo.create({
      txid: result.txid || 'failed',
      sparkAddress: payout.sparkAddress,
      amount: String(payout.amount),
      direction: 'out',
      purpose: 'payout',
      raceId,
      playerId: payout.playerId,
      status: result.success ? 'detected' : 'failed',
      instantLocked: false,
    });
    await this.onchainRepo.save(entity);
  }

  private async recordSystemEvent(
    raceId: string,
    address: string,
    amount: number,
    purpose: 'treasury' | 'reserve',
    txid: string,
  ): Promise<void> {
    const entity = this.onchainRepo.create({
      txid,
      sparkAddress: address,
      amount: String(amount),
      direction: 'out',
      purpose,
      raceId,
      status: 'detected',
      instantLocked: false,
    });
    await this.onchainRepo.save(entity);
  }
}
