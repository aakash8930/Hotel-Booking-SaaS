import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SubmitVerificationDto } from './dto/submit-verification.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: { sub: string; email: string };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // Max 5 registrations per minute per IP
  async register(@Body() dto: RegisterDto) {
    return {
      success: true,
      data: await this.authService.register(dto),
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } }) // Max 10 login attempts per minute per IP
  async login(@Body() dto: LoginDto) {
    return {
      success: true,
      data: await this.authService.login(dto),
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return {
      success: true,
      data: await this.authService.refreshToken(dto.refreshToken),
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: AuthenticatedRequest) {
    await this.authService.logout(req.user.sub);
    return { success: true, message: 'Logged out successfully' };
  }

  @Post('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: AuthenticatedRequest) {
    // Minimal "who am I" endpoint for verifying tokens on the frontend
    return {
      success: true,
      data: {
        id: req.user.sub,
        email: req.user.email,
      },
    };
  }

  /**
   * Submit (or resubmit) verification info. No automated ID-check API is
   * wired up — this puts the host in a PENDING queue an admin reviews.
   */
  @Post('host/verification')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async submitVerification(
    @CurrentUser('sub') hostId: string,
    @Body() dto: SubmitVerificationDto,
  ) {
    return { success: true, data: await this.authService.submitVerification(hostId, dto) };
  }

  @Get('host/verification')
  @UseGuards(JwtAuthGuard)
  async getVerification(@CurrentUser('sub') hostId: string) {
    return { success: true, data: await this.authService.getVerification(hostId) };
  }
}
