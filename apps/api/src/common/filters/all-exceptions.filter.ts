import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  private readonly isProd = process.env.NODE_ENV === 'production';

  catch(exception: unknown, host: ArgumentsHost): void {
    // Only handle HTTP contexts; let WS/RPC exceptions propagate normally
    if (host.getType() !== 'http') {
      this.logger.error(`Non-HTTP exception: ${exception}`);
      return;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();
      const rawMessage = typeof exResponse === 'string'
        ? exResponse
        : (exResponse as Record<string, unknown>).message;
      message = Array.isArray(rawMessage) ? rawMessage.join('; ') : String(rawMessage ?? 'Error');
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
      // Never leak internal error details to clients in production
      message = this.isProd ? 'Internal server error' : exception.message;
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
