import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * For endpoints that work anonymously but should recognize a logged-in
 * guest when one is present (e.g. booking creation attaches the booking
 * to the caller's account instead of doing find-or-create-by-email).
 * Never blocks the request — an invalid/missing token just means
 * `req.user` stays unset (handleRequest returns undefined instead of
 * throwing, and Nest's base canActivate treats that as "proceed").
 */
@Injectable()
export class OptionalGuestAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = { sub: string; email: string; role: string }>(
    _err: unknown,
    user: TUser | false,
  ): TUser | undefined {
    if (!user || (user as { role?: string }).role !== 'guest') {
      return undefined;
    }
    return user;
  }
}
