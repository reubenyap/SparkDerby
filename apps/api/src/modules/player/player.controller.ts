import { Controller, Post, Get, Body, Param, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { PlayerService } from './player.service';
import { IdentifyDto } from './dto/identify.dto';
import { SessionGuard } from '../../common/guards/session.guard';

@Controller('players')
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  @Post('identify')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async identify(@Body() dto: IdentifyDto, @Req() req: Request) {
    return this.playerService.identifyPlayer(dto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @UseGuards(SessionGuard)
  @Get(':sparkAddress/history')
  async getPlayerHistory(@Param('sparkAddress') sparkAddress: string) {
    return this.playerService.getPlayerHistory(sparkAddress);
  }
}
