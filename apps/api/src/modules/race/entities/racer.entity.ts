import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { RaceEntity } from './race.entity';

@Entity('racers')
export class RacerEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'race_id', type: 'uuid' })
  raceId!: string;

  @Column({ type: 'smallint' })
  lane!: number;

  @Column({ type: 'varchar', length: 64 })
  name!: string;

  @Column({ type: 'enum', enum: ['balanced', 'sprinter', 'closer', 'tank', 'wildcard', 'technician'] })
  archetype!: string;

  @Column({ type: 'numeric', precision: 8, scale: 4, default: 0 })
  position!: string;

  @Column({ type: 'numeric', precision: 6, scale: 4, default: 0 })
  speed!: string;

  @Column({ name: 'base_speed', type: 'numeric', precision: 6, scale: 4 })
  baseSpeed!: string;

  @Column({ type: 'numeric', precision: 6, scale: 4, default: 100 })
  stamina!: string;

  @Column({ name: 'luck_modifier', type: 'numeric', precision: 6, scale: 4, default: 0 })
  luckModifier!: string;

  @Column({ name: 'status_effects', type: 'jsonb', default: '[]' })
  statusEffects!: object[];

  @Column({ name: 'finish_position', type: 'smallint', nullable: true })
  finishPosition!: number | null;

  @Column({ name: 'finish_tick', type: 'smallint', nullable: true })
  finishTick!: number | null;

  @Column({ name: 'total_backed', type: 'numeric', precision: 18, scale: 8, default: 0 })
  totalBacked!: string;

  @Column({ name: 'backer_count', type: 'int', default: 0 })
  backerCount!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => RaceEntity, (race) => race.racers)
  @JoinColumn({ name: 'race_id' })
  race!: RaceEntity;
}
