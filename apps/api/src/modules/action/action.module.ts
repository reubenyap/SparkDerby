import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActionEntity } from './entities/action.entity';
import { ActionService } from './action.service';

@Module({
  imports: [TypeOrmModule.forFeature([ActionEntity])],
  providers: [ActionService],
  exports: [ActionService],
})
export class ActionModule {}
