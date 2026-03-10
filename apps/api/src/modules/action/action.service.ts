import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActionEntity } from './entities/action.entity';

@Injectable()
export class ActionService {
  private readonly logger = new Logger(ActionService.name);

  constructor(
    @InjectRepository(ActionEntity)
    private readonly actionRepo: Repository<ActionEntity>,
  ) {}

  async getActionsByRace(raceId: string): Promise<ActionEntity[]> {
    return this.actionRepo.find({
      where: { raceId },
      order: { createdAt: 'ASC' },
    });
  }

  async getPendingActions(raceId: string): Promise<ActionEntity[]> {
    return this.actionRepo.find({
      where: { raceId, status: 'pending' },
      order: { createdAt: 'ASC' },
    });
  }
}
