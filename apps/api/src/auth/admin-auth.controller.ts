import { RateLimit } from '../common/security/rate-limit.decorator';
import { RateLimitGuard } from '../common/security/rate-limit.guard'; from '../common/security/rate-limit.decorator';
import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import type { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: { sub: string; email: string };
}

/** No /register route — see AdminAuthService. */
@Controller('auth/admin')
@UseGuards(RateLimitGuard)
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @RateLimit('auth')
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(@Body() dto: AdminLoginDto) {
    return { success: true, data: await this.adminAuthService.login(dto) };
  }

  @RateLimit('auth')
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return { success: true, data: await this.adminAuthService.refreshToken(dto.refreshToken) };
  }

  @RateLimit('auth')
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminAuthGuard)
  async logout(@Req() req: AuthenticatedRequest) {
    await this.adminAuthService.logout(req.user.sub);
    return { success: true, message: 'Logged out successfully' };
  }

  @Post('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminAuthGuard)
  async me(@Req() req: AuthenticatedRequest) {
    return { success: true, data: { id: req.user.sub, email: req.user.email } };
  }
}
