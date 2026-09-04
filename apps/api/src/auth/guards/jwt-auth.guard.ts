import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guards host-only endpoints. Every existing usage of this guard predates
 * guest accounts and assumed any valid JWT was a host — now that guest
 * tokens exist too, it must reject them explicitly rather than just
 * checking "is this JWT valid".
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = { sub: string; email: string; role: string }>(
    err: unknown,
    user: TUser | false,
    info: unknown,
  ): TUser {
    if (err || !user || (user as { role?: string }).role !== 'host') {
      throw err || new UnauthorizedException('Host authentication required');
    }
    return user;
  }
}
