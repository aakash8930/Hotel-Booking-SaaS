import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Guards admin-only endpoints — rejects host/guest tokens. */
@Injectable()
export class AdminAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = { sub: string; email: string; role: string }>(
    err: unknown,
    user: TUser | false,
  ): TUser {
    if (err || !user || (user as { role?: string }).role !== 'admin') {
      throw err || new UnauthorizedException('Admin authentication required');
    }
    return user;
  }
}
