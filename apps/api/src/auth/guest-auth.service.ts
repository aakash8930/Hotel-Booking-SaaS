import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { prisma } from '@hbs/prisma';
import type { GuestRegisterDto } from './dto/guest-register.dto';
import type { GuestLoginDto } from './dto/guest-login.dto';

const BCRYPT_ROUNDS = 12;

interface TokenPayload {
  sub: string; // guest id
  email: string;
  type: 'access' | 'refresh';
  role: 'guest';
}

interface GuestAuthResponse {
  accessToken: string;
  refreshToken: string;
  guest: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
}

@Injectable()
export class GuestAuthService {
  private readonly logger = new Logger(GuestAuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Register a guest account. If a Guest row already exists for this email
   * (created via guest-checkout on a past booking), this "claims" it by
   * setting a password rather than erroring — the booking history then
   * shows up immediately in "My trips".
   */
  async register(dto: GuestRegisterDto): Promise<GuestAuthResponse> {
    const email = dto.email.toLowerCase();
    const existing = await prisma.guest.findUnique({ where: { email } });

    if (existing?.passwordHash) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const guest = existing
      ? await prisma.guest.update({
          where: { id: existing.id },
          data: { passwordHash, name: dto.name, phone: dto.phone ?? existing.phone },
        })
      : await prisma.guest.create({
          data: {
            email,
            passwordHash,
            name: dto.name,
            phone: dto.phone ?? null,
          },
        });

    this.logger.log(`Guest account ${existing ? 'claimed' : 'registered'}: ${guest.email} (${guest.id})`);

    const tokens = await this.generateTokens(guest.id, guest.email);
    await this.storeRefreshToken(guest.id, tokens.refreshToken);

    return { ...tokens, guest: this.toProfile(guest) };
  }

  async login(dto: GuestLoginDto): Promise<GuestAuthResponse> {
    const guest = await prisma.guest.findUnique({ where: { email: dto.email.toLowerCase() } });

    if (!guest || !guest.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const validPassword = await bcrypt.compare(dto.password, guest.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(guest.id, guest.email);
    await this.storeRefreshToken(guest.id, tokens.refreshToken);

    return { ...tokens, guest: this.toProfile(guest) };
  }

  async refreshToken(refreshToken: string): Promise<GuestAuthResponse> {
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

    const stored = await prisma.guestRefreshToken.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { guest: true },
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await prisma.guestRefreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.generateTokens(stored.guestId, stored.guest.email);
    await this.storeRefreshToken(stored.guestId, tokens.refreshToken);

    return { ...tokens, guest: this.toProfile(stored.guest) };
  }

  async logout(guestId: string): Promise<void> {
    await prisma.guestRefreshToken.updateMany({
      where: { guestId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private toProfile(guest: { id: string; name: string; email: string; phone: string | null }) {
    return { id: guest.id, name: guest.name, email: guest.email, phone: guest.phone };
  }

  private async generateTokens(
    guestId: string,
    email: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: TokenPayload = { sub: guestId, email, type: 'access', role: 'guest' };

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

  private async storeRefreshToken(guestId: string, refreshToken: string): Promise<void> {
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await prisma.guestRefreshToken.create({
      data: { guestId, tokenHash, expiresAt },
    });
  }
}
