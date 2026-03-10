import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { PlayerEntity } from './entities/player.entity';
import { BrowserSessionEntity } from './entities/browser-session.entity';
import { IdentifyDto } from './dto/identify.dto';

@Injectable()
export class PlayerService {
  private readonly logger = new Logger(PlayerService.name);

  constructor(
    @InjectRepository(PlayerEntity)
    private readonly playerRepo: Repository<PlayerEntity>,
    @InjectRepository(BrowserSessionEntity)
    private readonly sessionRepo: Repository<BrowserSessionEntity>,
  ) {}

  async identifyPlayer(dto: IdentifyDto) {
    const sparkAddress = dto.sparkAddress;

    let player = await this.playerRepo.findOne({
      where: { sparkAddress },
    });

    if (!player) {
      player = this.playerRepo.create({
        sparkAddress,
        sparkName: dto.sparkName || null,
      });
      player = await this.playerRepo.save(player);
      this.logger.log(`New player registered: ${sparkAddress.slice(0, 20)}...`);
    } else {
      player.lastActiveAt = new Date();
      if (dto.sparkName) {
        player.sparkName = dto.sparkName;
      }
      await this.playerRepo.save(player);
    }

    const sessionToken = randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const session = this.sessionRepo.create({
      playerId: player.id,
      sessionToken,
      expiresAt,
    });
    await this.sessionRepo.save(session);

    return {
      player: {
        id: player.id,
        sparkAddress: player.sparkAddress,
        sparkName: player.sparkName,
        totalRaces: player.totalRaces,
        totalBacked: player.totalBacked,
        totalWon: player.totalWon,
      },
      sessionToken,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async getPlayerHistory(sparkAddress: string) {
    const player = await this.playerRepo.findOne({
      where: { sparkAddress },
    });

    if (!player) {
      throw new NotFoundException(`Player not found: ${sparkAddress.slice(0, 20)}...`);
    }

    return {
      player: {
        sparkAddress: player.sparkAddress,
        sparkName: player.sparkName,
        totalRaces: player.totalRaces,
        totalBacked: player.totalBacked,
        totalWon: player.totalWon,
      },
      recentRaces: [], // TODO: join with backings + races
    };
  }

  async findBySessionToken(token: string): Promise<PlayerEntity | null> {
    const session = await this.sessionRepo.findOne({
      where: { sessionToken: token },
      relations: ['player'],
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    return session.player;
  }
}
