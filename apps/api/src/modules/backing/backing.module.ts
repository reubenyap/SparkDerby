import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BackingService } from './backing.service';
import { BackingEntity } from './entities/backing.entity';
import { RacerEntity } from '../race/entities/racer.entity';
import { RaceEntity } from '../race/entities/race.entity';
import { OnchainEventEntity } from '../onchain/entities/onchain-event.entity';
import { PlayerEntity } from '../player/entities/player.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BackingEntity, RacerEntity, RaceEntity, OnchainEventEntity, PlayerEntity,
    ]),
  ],
  providers: [BackingService],
  exports: [BackingService],
})
export class BackingModule {}
