import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { PlayerService } from '../player/player.service';

@WebSocketGateway({
  cors: {
    origin: process.env.API_CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/ws',
})
export class RaceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RaceGateway.name);

  constructor(private readonly playerService: PlayerService) {}

  async handleConnection(client: Socket): Promise<void> {
    const token =
      (client.handshake.auth?.token as string) ||
      (client.handshake.headers?.['x-session-token'] as string);

    if (!token) {
      this.logger.warn(`Client ${client.id} rejected: no session token`);
      client.emit('error', { message: 'Authentication required' });
      client.disconnect(true);
      return;
    }

    const player = await this.playerService.findBySessionToken(token);
    if (!player) {
      this.logger.warn(`Client ${client.id} rejected: invalid session token`);
      client.emit('error', { message: 'Invalid or expired session token' });
      client.disconnect(true);
      return;
    }

    (client as unknown as Record<string, unknown>)['player'] = player;
    this.logger.log(`Client connected: ${client.id} (player: ${player.id})`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  private static readonly UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  @SubscribeMessage('subscribe_race')
  handleSubscribeRace(
    @MessageBody() data: { raceId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    if (!(client as unknown as Record<string, unknown>)['player']) {
      return;
    }
    if (!data?.raceId || !RaceGateway.UUID_RE.test(data.raceId)) {
      client.emit('error', { message: 'Invalid race ID' });
      return;
    }
    client.join(`race:${data.raceId}`);
    this.logger.log(`Client ${client.id} subscribed to race ${data.raceId}`);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): void {
    client.emit('pong', { timestamp: Date.now() });
  }

  emitToRace(raceId: string, event: string, data: unknown): void {
    this.server.to(`race:${raceId}`).emit(event, data);
  }

  emitToAll(event: string, data: unknown): void {
    this.server.emit(event, data);
  }
}
