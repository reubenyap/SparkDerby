import { Module } from '@nestjs/common';
import { BroadcastService } from './broadcast.service';
import { RaceModule } from '../race/race.module';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [RaceModule, TelegramModule],
  providers: [BroadcastService],
  exports: [BroadcastService],
})
export class BroadcastModule {}
