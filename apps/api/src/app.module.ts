import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DatabaseModule } from './database/database.module';
import { RaceModule } from './modules/race/race.module';
import { PlayerModule } from './modules/player/player.module';
import { FiroModule } from './modules/firo/firo.module';
import { ActionModule } from './modules/action/action.module';
import { SettlementModule } from './modules/settlement/settlement.module';
import { BroadcastModule } from './modules/broadcast/broadcast.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuditModule } from './modules/audit/audit.module';
import { BackingModule } from './modules/backing/backing.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    DatabaseModule,
    RaceModule,
    PlayerModule,
    FiroModule,
    ActionModule,
    SettlementModule,
    BroadcastModule,
    TelegramModule,
    AdminModule,
    AuditModule,
    BackingModule,
  ],
})
export class AppModule {}
