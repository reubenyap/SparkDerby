import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { BackingEntity } from './entities/backing.entity';
import { RacerEntity } from '../race/entities/racer.entity';
import { RaceEntity } from '../race/entities/race.entity';
import { OnchainEventEntity } from '../onchain/entities/onchain-event.entity';
import { PlayerEntity } from '../player/entities/player.entity';
import { CHAIN_TX_CLASSIFIED, ChainTxClassifiedEvent } from '../firo/chain-watcher.service';
import { BACKING_POOL_SPLIT, BACKING_TREASURY_SPLIT } from '@sparkderby/shared';

/**
 * BackingService — creates backing records when the chain watcher
 * classifies an inbound transaction as a backing.
 *
 * Snapshots the player's payout address at backing time so that
 * settlement always pays to the address the player used when backing.
 */
@Injectable()
export class BackingService {
  private readonly logger = new Logger(BackingService.name);

  constructor(
    @InjectRepository(BackingEntity)
    private readonly backingRepo: Repository<BackingEntity>,
    @InjectRepository(RacerEntity)
    private readonly racerRepo: Repository<RacerEntity>,
    @InjectRepository(RaceEntity)
    private readonly raceRepo: Repository<RaceEntity>,
    @InjectRepository(OnchainEventEntity)
    private readonly onchainRepo: Repository<OnchainEventEntity>,
    @InjectRepository(PlayerEntity)
    private readonly playerRepo: Repository<PlayerEntity>,
  ) {}

  @OnEvent(CHAIN_TX_CLASSIFIED)
  async onTxClassified(event: ChainTxClassifiedEvent): Promise<void> {
    const { tx, classification } = event;
    if (classification.kind !== 'backing') return;

    const { raceId, racerId, amount } = classification;

    // Find the on-chain event record
    const onchainEvent = await this.onchainRepo.findOne({
      where: { txid: tx.txid },
    });
    if (!onchainEvent) {
      this.logger.warn(`No on-chain event for txid ${tx.txid}`);
      return;
    }

    // Prevent duplicate backing records
    const existing = await this.backingRepo.findOne({
      where: { onchainEventId: onchainEvent.id },
    });
    if (existing) return;

    // Get current race tick
    const race = await this.raceRepo.findOne({ where: { id: raceId } });
    if (!race || race.status === 'settled' || race.status === 'cancelled') {
      this.logger.warn(`Backing rejected: race ${raceId} status is ${race?.status}`);
      return;
    }

    // Resolve payout address: use player's spark address if player is known
    let payoutAddress = '';
    if (onchainEvent.playerId) {
      const player = await this.playerRepo.findOne({ where: { id: onchainEvent.playerId } });
      if (player) {
        payoutAddress = player.sparkAddress;
      }
    }

    // If no player resolved, use the source memo or leave as the tx sender info
    // The payout address is critical — log a warning if we can't determine it
    if (!payoutAddress) {
      this.logger.warn(
        `Could not resolve payout address for backing txid=${tx.txid}, ` +
        `playerId=${onchainEvent.playerId || 'unknown'}`,
      );
    }

    const poolAmount = amount * BACKING_POOL_SPLIT;
    const treasuryAmount = amount * BACKING_TREASURY_SPLIT;

    const backing = this.backingRepo.create({
      raceId,
      racerId,
      playerId: onchainEvent.playerId || null,
      onchainEventId: onchainEvent.id,
      amount: String(amount),
      poolAmount: String(poolAmount),
      treasuryAmount: String(treasuryAmount),
      payoutAddress,
      tickReceived: race.currentTick,
    });
    await this.backingRepo.save(backing);

    // Update racer totals
    await this.racerRepo
      .createQueryBuilder()
      .update()
      .set({
        totalBacked: () => `total_backed + ${amount}`,
        backerCount: () => `backer_count + 1`,
      })
      .where('id = :id', { id: racerId })
      .execute();

    this.logger.log(
      `Backing recorded: ${amount} FIRO on racer ${racerId} in race ${raceId} (payout→${payoutAddress || 'unresolved'})`,
    );
  }
}
