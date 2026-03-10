import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RaceEntity } from './entities/race.entity';
import { RacerEntity } from './entities/racer.entity';
import { TickSnapshotEntity } from './entities/tick-snapshot.entity';

@Injectable()
export class RaceService {
  private readonly logger = new Logger(RaceService.name);

  constructor(
    @InjectRepository(RaceEntity)
    private readonly raceRepo: Repository<RaceEntity>,
    @InjectRepository(RacerEntity)
    private readonly racerRepo: Repository<RacerEntity>,
    @InjectRepository(TickSnapshotEntity)
    private readonly tickRepo: Repository<TickSnapshotEntity>,
  ) {}

  async getCurrentRace() {
    const race = await this.raceRepo.findOne({
      where: [{ status: 'active' }, { status: 'scheduled' }],
      relations: ['racers'],
      order: { startsAt: 'ASC' },
    });

    if (!race) {
      return { race: null, message: 'No active or upcoming race' };
    }

    return { race };
  }

  async getRaceById(raceId: string) {
    const race = await this.raceRepo.findOne({
      where: { id: raceId },
      relations: ['racers'],
    });

    if (!race) {
      throw new NotFoundException(`Race ${raceId} not found`);
    }

    const ticks = await this.tickRepo.find({
      where: { raceId },
      order: { tick: 'ASC' },
    });

    return { race, ticks };
  }

  async getRaceTicks(raceId: string) {
    const ticks = await this.tickRepo.find({
      where: { raceId },
      order: { tick: 'ASC' },
    });
    return { ticks };
  }

  async getRaceHistory(page: number, limit: number) {
    const [races, total] = await this.raceRepo.findAndCount({
      where: { status: 'settled' },
      relations: ['racers'],
      order: { startsAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      races,
      pagination: { page, limit, total },
    };
  }

  async findActiveRace(): Promise<RaceEntity | null> {
    return this.raceRepo.findOne({
      where: { status: 'active' },
      relations: ['racers'],
    });
  }

  async updateRaceStatus(raceId: string, status: string): Promise<void> {
    await this.raceRepo.update(raceId, { status });
  }
}
