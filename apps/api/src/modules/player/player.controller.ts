import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { PlayerService } from './player.service';
import { IdentifyDto } from './dto/identify.dto';

@Controller('players')
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  @Post('identify')
  async identify(@Body() dto: IdentifyDto) {
    return this.playerService.identifyPlayer(dto);
  }

  @Get(':sparkAddress/history')
  async getPlayerHistory(@Param('sparkAddress') sparkAddress: string) {
    return this.playerService.getPlayerHistory(sparkAddress);
  }
}
