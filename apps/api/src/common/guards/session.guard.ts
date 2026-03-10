import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { PlayerService } from '../../modules/player/player.service';

/**
 * SessionGuard — validates the X-Session-Token header against
 * stored browser sessions. Attaches the resolved player to the request.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly playerService: PlayerService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.headers['x-session-token'] as string | undefined;

    if (!token) {
      throw new UnauthorizedException('Missing session token');
    }

    const player = await this.playerService.findBySessionToken(token);
    if (!player) {
      throw new UnauthorizedException('Invalid or expired session token');
    }

    // Attach player to request for downstream use
    (request as Record<string, unknown>)['player'] = player;
    return true;
  }
}
