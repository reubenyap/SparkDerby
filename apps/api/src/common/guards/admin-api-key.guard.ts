import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * AdminApiKeyGuard — protects admin endpoints with a shared API key.
 *
 * Expects the key in the `X-Admin-Key` header (or `Authorization: Bearer <key>`).
 * If ADMIN_API_KEY is not configured, ALL admin requests are rejected
 * in production and allowed in development (with a warning).
 */
@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(AdminApiKeyGuard.name);
  private readonly apiKey: string | undefined;
  private readonly isProd: boolean;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ADMIN_API_KEY');
    this.isProd = process.env.NODE_ENV === 'production';

    if (!this.apiKey && this.isProd) {
      this.logger.error(
        'ADMIN_API_KEY is not set — all admin requests will be rejected in production',
      );
    } else if (!this.apiKey) {
      this.logger.warn(
        'ADMIN_API_KEY is not set — admin endpoints are unprotected in development',
      );
    }
  }

  canActivate(context: ExecutionContext): boolean {
    // In production, always require the key
    if (!this.apiKey) {
      if (this.isProd) {
        throw new UnauthorizedException('Admin access not configured');
      }
      // Allow in development without key (with warning already logged)
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const headerKey = request.headers['x-admin-key'] as string | undefined;
    const authHeader = request.headers['authorization'] as string | undefined;

    let providedKey: string | undefined;

    if (headerKey) {
      providedKey = headerKey;
    } else if (authHeader?.startsWith('Bearer ')) {
      providedKey = authHeader.slice(7);
    }

    if (!providedKey || providedKey !== this.apiKey) {
      this.logger.warn(`Unauthorized admin access attempt from ${request.ip}`);
      throw new UnauthorizedException('Invalid admin API key');
    }

    return true;
  }
}
