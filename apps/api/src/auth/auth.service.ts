import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { prisma } from '@hbs/prisma';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import type { SubmitVerificationDto } from './dto/submit-verification.dto';

const BCRYPT_ROUNDS = 12;

interface TokenPayload {
  sub: string; // host id
  email: string;
  type: 'access' | 'refresh';
  role: 'host';
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  host: {
    id: string;
    name: string;
    email: string;
    businessName: string | null;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Register a new host account.
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await prisma.host.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const host = await prisma.host.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        name: dto.name,
        phone: dto.phone ?? null,
        businessName: dto.businessName ?? null,
      },
    });

    this.logger.log(`New host registered: ${host.email} (${host.id})`);

    const tokens = await this.generateTokens(host.id, host.email);
    await this.storeRefreshToken(host.id, tokens.refreshToken);

    return {
      ...tokens,
      host: {
        id: host.id,
        name: host.name,
        email: host.email,
        businessName: host.businessName,
      },
    };
  }

  /**
   * Authenticate a host with email + password.
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    const host = await prisma.host.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!host || !host.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const validPassword = await bcrypt.compare(dto.password, host.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(host.id, host.email);
    await this.storeRefreshToken(host.id, tokens.refreshToken);

    return {
      ...tokens,
      host: {
        id: host.id,
        name: host.name,
        email: host.email,
        businessName: host.businessName,
      },
    };
  }

  /**
   * Refresh an expired access token using a valid refresh token.
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

    // Find the stored refresh token
    const stored = await prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { host: true },
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Rotate: revoke old token, issue new pair
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.generateTokens(stored.hostId, stored.host.email);
    await this.storeRefreshToken(stored.hostId, tokens.refreshToken);

    return {
      ...tokens,
      host: {
        id: stored.host.id,
        name: stored.host.name,
        email: stored.host.email,
        businessName: stored.host.businessName,
      },
    };
  }

  /**
   * Submit host verification info for admin review. No automated ID-check
   * API is wired up (real ones need a paid, KYC-registered provider) — this
   * queues a PENDING record for a human admin to approve/reject. The raw ID
   * number is never stored, only a masked form, matching how Payment.upiId
   * is already handled elsewhere in this codebase.
   */
  async submitVerification(hostId: string, dto: SubmitVerificationDto) {
    const masked = dto.idNumber.length > 4
      ? `${'X'.repeat(dto.idNumber.length - 4)}${dto.idNumber.slice(-4)}`
      : dto.idNumber;

    return prisma.host.update({
      where: { id: hostId },
      data: {
        verificationStatus: 'PENDING',
        verificationNote: `${dto.idType}: ${masked}`,
        verifiedAt: null,
      },
      select: { verificationStatus: true, verificationNote: true, verifiedAt: true },
    });
  }

  async getVerification(hostId: string) {
    return prisma.host.findUniqueOrThrow({
      where: { id: hostId },
      select: { verificationStatus: true, verificationNote: true, verifiedAt: true },
    });
  }

  /**
   * Logout — revoke all refresh tokens for a host.
   */
  async logout(hostId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { hostId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Generate an access + refresh token pair.
   */
  private async generateTokens(
    hostId: string,
    email: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: TokenPayload = {
      sub: hostId,
      email,
      type: 'access',
      role: 'host',
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.jwtService.sign(
      { ...payload, type: 'refresh' },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET') ?? (process.env.NODE_ENV === 'production' ? (() => { throw new Error('JWT_REFRESH_SECRET is required in production'); })() : 'dev-refresh-secret-change-me'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '30d'),
      },
    );

    return { accessToken, refreshToken };
  }

  /**
   * Hash and store a refresh token in the database.
   */
  private async storeRefreshToken(
    hostId: string,
    refreshToken: string,
  ): Promise<void> {
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await prisma.refreshToken.create({
      data: {
        hostId,
        tokenHash,
        expiresAt,
      },
    });
  }
}
