import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class BroadcastService {
  private readonly logger = new Logger(BroadcastService.name);

  async emit(event: string, data: unknown): Promise<void> {
    this.logger.debug(`Broadcast event: ${event}`);
    // TODO: Wire up to RaceGateway for WebSocket emission
    // TODO: Wire up to TelegramService for Telegram broadcasting
  }
}
