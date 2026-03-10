import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { timingSafeEqual } from 'crypto';

/**
 * AdminApiKeyGuard — protects admin endpoints with a shared API key.
 *
 * Expects the key in the `X-Admin-Key` header (or `Authorization: Bearer <key>`).
 * If ADMIN_API_KEY is not configured, ALL admin requests are rejected
 * regardless of environment.
 */
@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(AdminApiKeyGuard.name);
  private readonly apiKey: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ADMIN_API_KEY');

    if (!this.apiKey) {
      this.logger.error(
        'ADMIN_API_KEY is not set — all admin requests will be rejected',
      );
    }
  }

  canActivate(context: ExecutionContext): boolean {
    if (!this.apiKey) {
      throw new UnauthorizedException('Admin access not configured');
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

    if (!providedKey || !this.safeCompare(providedKey, this.apiKey)) {
      this.logger.warn(`Unauthorized admin access attempt from ${request.ip}`);
      throw new UnauthorizedException('Invalid admin API key');
    }

    return true;
  }

  private safeCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a, 'utf-8');
    const bufB = Buffer.from(b, 'utf-8');
    if (bufA.length !== bufB.length) {
      // Compare against self to keep constant time, then return false
      timingSafeEqual(bufB, bufB);
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  }
}
