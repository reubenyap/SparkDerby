import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { RaceEntity } from '../../race/entities/race.entity';
import { RacerEntity } from '../../race/entities/racer.entity';
import { PlayerEntity } from '../../player/entities/player.entity';
import { OnchainEventEntity } from '../../onchain/entities/onchain-event.entity';

@Entity('backings')
export class BackingEntity {
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

  @Column({ type: 'numeric', precision: 18, scale: 8 })
  amount!: string;

  @Column({ name: 'pool_amount', type: 'numeric', precision: 18, scale: 8 })
  poolAmount!: string;

  @Column({ name: 'treasury_amount', type: 'numeric', precision: 18, scale: 8 })
  treasuryAmount!: string;

  @Column({ name: 'tick_received', type: 'smallint' })
  tickReceived!: number;

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
