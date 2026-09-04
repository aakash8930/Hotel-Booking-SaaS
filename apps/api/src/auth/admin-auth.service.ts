import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { prisma } from '@hbs/prisma';
import type { AdminLoginDto } from './dto/admin-login.dto';

interface TokenPayload {
  sub: string; // admin id
  email: string;
  type: 'access' | 'refresh';
  role: 'admin';
}

interface AdminAuthResponse {
  accessToken: string;
  refreshToken: string;
  admin: { id: string; name: string; email: string };
}

/**
 * No `register()` here on purpose — see the Admin model's schema comment.
 * Admin accounts are created by scripts/create-admin.ts, not this service.
 */
@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: AdminLoginDto): Promise<AdminAuthResponse> {
    const admin = await prisma.admin.findUnique({ where: { email: dto.email.toLowerCase() } });

    if (!admin) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const validPassword = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(admin.id, admin.email);
    await this.storeRefreshToken(admin.id, tokens.refreshToken);

    this.logger.log(`Admin login: ${admin.email} (${admin.id})`);

    return { ...tokens, admin: { id: admin.id, name: admin.name, email: admin.email } };
  }

  async refreshToken(refreshToken: string): Promise<AdminAuthResponse> {
    const tokenHash = await bcrypt.hash(refreshToken, 10);

    const stored = await prisma.adminRefreshToken.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { admin: true },
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await prisma.adminRefreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.generateTokens(stored.adminId, stored.admin.email);
    await this.storeRefreshToken(stored.adminId, tokens.refreshToken);

    return {
      ...tokens,
      admin: { id: stored.admin.id, name: stored.admin.name, email: stored.admin.email },
    };
  }

  async logout(adminId: string): Promise<void> {
    await prisma.adminRefreshToken.updateMany({
      where: { adminId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async generateTokens(
    adminId: string,
    email: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: TokenPayload = { sub: adminId, email, type: 'access', role: 'admin' };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.jwtService.sign(
      { ...payload, type: 'refresh' },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '30d'),
      },
    );

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(adminId: string, refreshToken: string): Promise<void> {
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await prisma.adminRefreshToken.create({
      data: { adminId, tokenHash, expiresAt },
    });
  }
}
