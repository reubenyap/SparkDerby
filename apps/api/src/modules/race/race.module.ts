import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RaceEntity } from './entities/race.entity';
import { RacerEntity } from './entities/racer.entity';
import { RaceAddressEntity } from './entities/race-address.entity';
import { TickSnapshotEntity } from './entities/tick-snapshot.entity';
import { RaceController } from './race.controller';
import { RaceService } from './race.service';
import { RaceGateway } from './race.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([RaceEntity, RacerEntity, RaceAddressEntity, TickSnapshotEntity]),
  ],
  controllers: [RaceController],
  providers: [RaceService, RaceGateway],
  exports: [RaceService],
})
export class RaceModule {}
