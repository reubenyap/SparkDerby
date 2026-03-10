import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { RaceEntity } from './race.entity';
import { RacerEntity } from './racer.entity';

@Entity('race_addresses')
export class RaceAddressEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'race_id', type: 'uuid' })
  raceId!: string;

  @Column({ name: 'racer_id', type: 'uuid' })
  racerId!: string;

  @Column({ type: 'enum', enum: ['back', 'boost', 'emp', 'oil_slick', 'overclock', 'black_swan'] })
  intent!: string;

  @Column({ name: 'spark_address', type: 'varchar', length: 160, unique: true })
  sparkAddress!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => RaceEntity, (race) => race.addresses)
  @JoinColumn({ name: 'race_id' })
  race!: RaceEntity;

  @ManyToOne(() => RacerEntity)
  @JoinColumn({ name: 'racer_id' })
  racer!: RacerEntity;
}
