import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { RaceEntity } from '../../race/entities/race.entity';
import { RacerEntity } from '../../race/entities/racer.entity';
import { PlayerEntity } from '../../player/entities/player.entity';
import { OnchainEventEntity } from '../../onchain/entities/onchain-event.entity';

@Entity('actions')
export class ActionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'race_id', type: 'uuid' })
  raceId!: string;

  @Column({ name: 'racer_id', type: 'uuid' })
  racerId!: string;

  @Column({ name: 'player_id', type: 'uuid', nullable: true })
  playerId!: string | null;

  @Column({ name: 'onchain_event_id', type: 'uuid' })
  onchainEventId!: string;

  @Column({ name: 'action_type', type: 'enum', enum: ['boost', 'emp', 'oil_slick', 'overclock', 'black_swan'] })
  actionType!: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'applied', 'rejected', 'expired'],
    default: 'pending',
  })
  status!: string;

  @Column({ type: 'numeric', precision: 18, scale: 8 })
  cost!: string;

  @Column({ name: 'pool_share', type: 'numeric', precision: 18, scale: 8 })
  poolShare!: string;

  @Column({ name: 'treasury_share', type: 'numeric', precision: 18, scale: 8 })
  treasuryShare!: string;

  @Column({ name: 'reserve_share', type: 'numeric', precision: 18, scale: 8 })
  reserveShare!: string;

  @Column({ name: 'applied_at_tick', type: 'smallint', nullable: true })
  appliedAtTick!: number | null;

  @Column({ name: 'effect_magnitude', type: 'numeric', precision: 8, scale: 4, nullable: true })
  effectMagnitude!: string | null;

  @Column({ name: 'diminishing_factor', type: 'numeric', precision: 6, scale: 4, default: 1.0 })
  diminishingFactor!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => RaceEntity)
  @JoinColumn({ name: 'race_id' })
  race!: RaceEntity;

  @ManyToOne(() => RacerEntity)
  @JoinColumn({ name: 'racer_id' })
  racer!: RacerEntity;

  @ManyToOne(() => PlayerEntity, { nullable: true })
  @JoinColumn({ name: 'player_id' })
  player!: PlayerEntity | null;

  @ManyToOne(() => OnchainEventEntity)
  @JoinColumn({ name: 'onchain_event_id' })
  onchainEvent!: OnchainEventEntity;
}
