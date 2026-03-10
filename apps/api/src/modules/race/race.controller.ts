import { Controller, Get, Param, Query } from '@nestjs/common';
import { RaceService } from './race.service';

@Controller('races')
export class RaceController {
  constructor(private readonly raceService: RaceService) {}

  @Get('current')
  async getCurrentRace() {
    return this.raceService.getCurrentRace();
  }

  @Get('history')
  async getRaceHistory(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const safePage = Math.max(1, Math.floor(Number(page) || 1));
    const safeLimit = Math.min(100, Math.max(1, Math.floor(Number(limit) || 20)));
    return this.raceService.getRaceHistory(safePage, safeLimit);
  }

  @Get(':raceId')
  async getRace(@Param('raceId') raceId: string) {
    return this.raceService.getRaceById(raceId);
  }

  @Get(':raceId/ticks')
  async getRaceTicks(@Param('raceId') raceId: string) {
    return this.raceService.getRaceTicks(raceId);
  }
}
