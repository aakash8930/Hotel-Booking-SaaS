import { RateLimit } from '../common/security/rate-limit.decorator';
import { RateLimitGuard } from '../common/security/rate-limit.guard'; from '../common/security/rate-limit.decorator';
import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { GuestAuthService } from './guest-auth.service';
import { GuestRegisterDto } from './dto/guest-register.dto';
import { GuestLoginDto } from './dto/guest-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { GuestAuthGuard } from './guards/guest-auth.guard';
import type { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: { sub: string; email: string };
}

@Controller('auth/guest')
@UseGuards(RateLimitGuard)
export class GuestAuthController {
  constructor(private readonly guestAuthService: GuestAuthService) {}

  @RateLimit('auth')
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async register(@Body() dto: GuestRegisterDto) {
    return { success: true, data: await this.guestAuthService.register(dto) };
  }

  @RateLimit('auth')
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(@Body() dto: GuestLoginDto) {
    return { success: true, data: await this.guestAuthService.login(dto) };
  }

  @RateLimit('auth')
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return { success: true, data: await this.guestAuthService.refreshToken(dto.refreshToken) };
  }

  @RateLimit('auth')
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(GuestAuthGuard)
  async logout(@Req() req: AuthenticatedRequest) {
    await this.guestAuthService.logout(req.user.sub);
    return { success: true, message: 'Logged out successfully' };
  }

  @Post('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(GuestAuthGuard)
  async me(@Req() req: AuthenticatedRequest) {
    return { success: true, data: { id: req.user.sub, email: req.user.email } };
  }
}
