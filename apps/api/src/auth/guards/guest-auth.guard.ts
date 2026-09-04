import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Guards guest-only endpoints (my trips, reviews) — rejects host tokens. */
@Injectable()
export class GuestAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = { sub: string; email: string; role: string }>(
    err: unknown,
    user: TUser | false,
  ): TUser {
    if (err || !user || (user as { role?: string }).role !== 'guest') {
      throw err || new UnauthorizedException('Guest authentication required');
    }
    return user;
  }
}
