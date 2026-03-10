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
    return this.raceService.getRaceHistory(Number(page), Number(limit));
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
