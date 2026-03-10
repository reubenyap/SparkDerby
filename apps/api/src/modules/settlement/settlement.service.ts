import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SettlementEntity } from './entities/settlement.entity';
import { RaceEntity } from '../race/entities/race.entity';
import { RacerEntity } from '../race/entities/racer.entity';
import { BackingEntity } from '../backing/entities/backing.entity';
import { FiroRpcService } from '../firo/firo-rpc.service';
import { PayoutService } from '../firo/payout.service';
import { ReconciliationService } from '../firo/reconciliation.service';
import { ConfigService } from '@nestjs/config';
import {
  calculatePayouts,
  FinishEntry,
  BackingEntry,
} from '@sparkderby/shared';

export const SETTLEMENT_STARTED = 'settlement.started';
export const SETTLEMENT_CALCULATED = 'settlement.calculated';
export const SETTLEMENT_PAYOUTS_SENT = 'settlement.payouts_sent';
export const SETTLEMENT_COMPLETED = 'settlement.completed';
export const SETTLEMENT_FAILED = 'settlement.failed';

export interface SettlementEvent {
  raceId: string;
  status: string;
  totalPrizePool?: number;
  payoutCount?: number;
  error?: string;
}

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  constructor(
    @InjectRepository(SettlementEntity)
    private readonly settlementRepo: Repository<SettlementEntity>,
    @InjectRepository(RaceEntity)
    private readonly raceRepo: Repository<RaceEntity>,
    @InjectRepository(RacerEntity)
    private readonly racerRepo: Repository<RacerEntity>,
    @InjectRepository(BackingEntity)
    private readonly backingRepo: Repository<BackingEntity>,
    private readonly firoRpc: FiroRpcService,
    private readonly payoutService: PayoutService,
    private readonly reconciliation: ReconciliationService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getSettlementByRace(raceId: string): Promise<SettlementEntity | null> {
    return this.settlementRepo.findOne({ where: { raceId } });
  }

  /**
   * Full settlement flow:
   * 1. Mark race as settling
   * 2. Determine finish order from racer positions
   * 3. Gather all backings
   * 4. Calculate pari-mutuel payouts
   * 5. Execute on-chain payouts (winners + treasury + reserve)
   * 6. Run reconciliation
   * 7. Mark completed
   */
  async settleRace(raceId: string): Promise<SettlementEntity> {
    this.logger.log(`Starting settlement for race ${raceId}`);

    const existing = await this.settlementRepo.findOne({ where: { raceId } });
    if (existing && existing.status === 'completed') {
      this.logger.warn(`Race ${raceId} already settled`);
      return existing;
    }

    await this.raceRepo.update(raceId, { status: 'settling' });
    this.eventEmitter.emit(SETTLEMENT_STARTED, { raceId, status: 'settling' } satisfies SettlementEvent);

    const race = await this.raceRepo.findOne({ where: { id: raceId }, relations: ['racers'] });
    if (!race) throw new Error(`Race ${raceId} not found`);

    let settlement = existing || this.settlementRepo.create({
      raceId,
      status: 'calculating',
      totalPrizePool: '0',
      totalTreasury: '0',
      totalReserve: '0',
      firstPlacePool: '0',
      secondPlacePool: '0',
      thirdPlacePool: '0',
      startedAt: new Date(),
    });
    settlement.status = 'calculating';
    settlement.startedAt = new Date();
    settlement = await this.settlementRepo.save(settlement);

    try {
      const finishOrder = this.buildFinishOrder(race.racers);
      this.logger.log(`Finish order: ${finishOrder.map(f => `${f.place}. ${f.name}`).join(', ')}`);

      const backingEntities = await this.backingRepo.find({ where: { raceId } });
      const backings: BackingEntry[] = backingEntities.map(b => ({
        playerId: b.playerId || 'anonymous',
        sparkAddress: '',
        racerId: b.racerId,
        amount: parseFloat(b.poolAmount),
      }));

      const totalBacking = backings.reduce((s, b) => s + b.amount, 0);
      const totalActionSpend = parseFloat(race.totalActionPool);

      const payoutResult = calculatePayouts(finishOrder, backings, totalBacking, totalActionSpend);

      this.logger.log(
        `Payout: pool=${payoutResult.totalPrizePool.toFixed(4)}, ` +
        `treasury=${payoutResult.totalTreasury.toFixed(4)}, ` +
        `reserve=${payoutResult.totalReserve.toFixed(4)}, ` +
        `payouts=${payoutResult.payouts.length}`,
      );

      settlement.totalPrizePool = String(payoutResult.totalPrizePool);
      settlement.totalTreasury = String(payoutResult.totalTreasury);
      settlement.totalReserve = String(payoutResult.totalReserve);
      settlement.firstPlacePool = String(payoutResult.placePools[1] || 0);
      settlement.secondPlacePool = String(payoutResult.placePools[2] || 0);
      settlement.thirdPlacePool = String(payoutResult.placePools[3] || 0);
      settlement.payouts = payoutResult.payouts as unknown as object[];
      settlement.status = 'paying_out';
      settlement = await this.settlementRepo.save(settlement);

      this.eventEmitter.emit(SETTLEMENT_CALCULATED, {
        raceId, status: 'paying_out',
        totalPrizePool: payoutResult.totalPrizePool,
        payoutCount: payoutResult.payouts.length,
      } satisfies SettlementEvent);

      const treasuryAddr = this.configService.get<string>('firo.treasuryAddress', '');
      const reserveAddr = this.configService.get<string>('firo.reserveAddress', '');

      const payoutEntries = payoutResult.payouts.map(p => ({
        playerId: p.playerId,
        sparkAddress: p.sparkAddress,
        amount: p.payout,
        place: p.place,
        racerId: p.racerId,
        backedAmount: p.backedAmount,
        share: p.share,
      }));

      const payoutEvent = await this.payoutService.executePayouts(
        this.firoRpc.adapter, raceId, payoutEntries,
        treasuryAddr, payoutResult.totalTreasury,
        reserveAddr, payoutResult.totalReserve,
      );

      settlement.treasuryTxid = payoutEvent.treasuryTxid || null;
      settlement.reserveTxid = payoutEvent.reserveTxid || null;

      await this.reconciliation.reconcileRace(this.firoRpc.adapter, raceId);

      settlement.status = 'completed';
      settlement.completedAt = new Date();
      settlement = await this.settlementRepo.save(settlement);

      await this.raceRepo.update(raceId, { status: 'settled' });

      this.eventEmitter.emit(SETTLEMENT_COMPLETED, {
        raceId, status: 'completed',
        totalPrizePool: payoutResult.totalPrizePool,
        payoutCount: payoutResult.payouts.length,
      } satisfies SettlementEvent);

      this.logger.log(`Settlement completed for race ${raceId}`);
      return settlement;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Settlement failed for race ${raceId}: ${errorMsg}`);
      settlement.status = 'failed';
      settlement.errorLog = errorMsg;
      await this.settlementRepo.save(settlement);
      this.eventEmitter.emit(SETTLEMENT_FAILED, { raceId, status: 'failed', error: errorMsg } satisfies SettlementEvent);
      throw err;
    }
  }

  private buildFinishOrder(racers: RacerEntity[]): FinishEntry[] {
    const sorted = [...racers].sort((a, b) => {
      if (a.finishPosition !== null && b.finishPosition !== null) return a.finishPosition - b.finishPosition;
      if (a.finishPosition !== null) return -1;
      if (b.finishPosition !== null) return 1;
      return parseFloat(b.position) - parseFloat(a.position);
    });
    return sorted.map((r, i) => ({
      racerId: r.id, name: r.name,
      position: parseFloat(r.position),
      finishTick: r.finishTick, place: i + 1,
    }));
  }
}
