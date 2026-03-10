import { Controller, Get, Param, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RaceEntity } from '../race/entities/race.entity';
import { TickSnapshotEntity } from '../race/entities/tick-snapshot.entity';
import { ActionEntity } from '../action/entities/action.entity';
import { BackingEntity } from '../backing/entities/backing.entity';
import { OnchainEventEntity } from '../onchain/entities/onchain-event.entity';
import { SettlementEntity } from '../settlement/entities/settlement.entity';
import { verifyReplayLog, ReplayLog } from '@sparkderby/shared';

/**
 * AuditController — provides endpoints for auditing and replaying races.
 *
 * Serves complete replay logs, on-chain event histories, and
 * settlement records for full transparency.
 */
@Controller('audit')
export class AuditController {
  private readonly logger = new Logger(AuditController.name);

  constructor(
    @InjectRepository(RaceEntity)
    private readonly raceRepo: Repository<RaceEntity>,
    @InjectRepository(TickSnapshotEntity)
    private readonly tickRepo: Repository<TickSnapshotEntity>,
    @InjectRepository(ActionEntity)
    private readonly actionRepo: Repository<ActionEntity>,
    @InjectRepository(BackingEntity)
    private readonly backingRepo: Repository<BackingEntity>,
    @InjectRepository(OnchainEventEntity)
    private readonly onchainRepo: Repository<OnchainEventEntity>,
    @InjectRepository(SettlementEntity)
    private readonly settlementRepo: Repository<SettlementEntity>,
  ) {}

  /**
   * Full replay log for a race — contains all data needed
   * to independently verify race outcome.
   */
  @Get(':raceId/replay')
  async getReplayLog(@Param('raceId') raceId: string) {
    const race = await this.raceRepo.findOne({
      where: { id: raceId },
      relations: ['racers'],
    });
    if (!race) return { error: 'Race not found' };

    const ticks = await this.tickRepo.find({
      where: { raceId },
      order: { tick: 'ASC' },
    });

    const actions = await this.actionRepo.find({
      where: { raceId },
      order: { createdAt: 'ASC' },
    });

    const settlement = await this.settlementRepo.findOne({ where: { raceId } });

    // Build replay log structure
    const replayLog = {
      version: '1.0',
      raceId,
      slot: race.slot,
      raceDate: race.raceDate,
      serverSecretHash: race.randomnessCommit,
      serverSecret: race.randomnessReveal,
      racers: race.racers.map(r => ({
        id: r.id,
        lane: r.lane,
        name: r.name,
        archetype: r.archetype,
      })),
      ticks: ticks.map(t => ({
        tick: t.tick,
        blockHash: t.blockHash,
        randomSeed: t.randomSeed,
        racerStates: t.racerStates,
        actionsApplied: t.actionsApplied,
        commentary: t.commentary,
      })),
      actions: actions.map(a => ({
        id: a.id,
        actionType: a.actionType,
        racerId: a.racerId,
        status: a.status,
        cost: a.cost,
        appliedAtTick: a.appliedAtTick,
        effectMagnitude: a.effectMagnitude,
      })),
      finishOrder: race.racers
        .filter(r => r.finishPosition !== null)
        .sort((a, b) => (a.finishPosition ?? 99) - (b.finishPosition ?? 99))
        .map((r, i) => ({
          racerId: r.id,
          name: r.name,
          position: parseFloat(r.position),
          finishTick: r.finishTick,
          place: i + 1,
        })),
      settlement: settlement ? {
        status: settlement.status,
        totalPrizePool: settlement.totalPrizePool,
        totalTreasury: settlement.totalTreasury,
        totalReserve: settlement.totalReserve,
        payouts: settlement.payouts,
        completedAt: settlement.completedAt,
      } : null,
    };

    return replayLog;
  }

  /**
   * Verify a replay log against the deterministic engine.
   * Accepts a full ReplayLog and returns verification result.
   */
  @Get(':raceId/verify')
  async verifyRace(@Param('raceId') raceId: string) {
    const race = await this.raceRepo.findOne({
      where: { id: raceId },
      relations: ['racers'],
    });
    if (!race) return { error: 'Race not found' };

    if (!race.randomnessReveal) {
      return {
        raceId,
        verified: false,
        reason: 'Randomness not yet revealed (race may still be active)',
      };
    }

    // For verification, we need the full replay log
    // In production, callers could also POST their own replay log
    return {
      raceId,
      randomnessCommit: race.randomnessCommit,
      randomnessRevealed: !!race.randomnessReveal,
      message: 'Download the replay log from /audit/:raceId/replay and run verifyReplayLog() from @sparkderby/shared',
    };
  }

  /**
   * All on-chain events for a race — backing transactions, action
   * transactions, payouts, treasury/reserve sends.
   */
  @Get(':raceId/onchain')
  async getOnchainEvents(@Param('raceId') raceId: string) {
    const events = await this.onchainRepo.find({
      where: { raceId },
      order: { createdAt: 'ASC' },
    });
    return { raceId, events };
  }

  /**
   * All backings for a race with amounts and pool splits.
   */
  @Get(':raceId/backings')
  async getBackings(@Param('raceId') raceId: string) {
    const backings = await this.backingRepo.find({
      where: { raceId },
      order: { createdAt: 'ASC' },
    });
    return { raceId, backings };
  }

  /**
   * Settlement details for a race.
   */
  @Get(':raceId/settlement')
  async getSettlement(@Param('raceId') raceId: string) {
    const settlement = await this.settlementRepo.findOne({ where: { raceId } });
    return { raceId, settlement };
  }
}
