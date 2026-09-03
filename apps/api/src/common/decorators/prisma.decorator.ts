import { Inject } from '@nestjs/common';
import type { PrismaClient } from '@hbs/prisma';

/**
 * Decorator for injecting the PrismaClient into NestJS services.
 *
 * Usage:
 *   constructor(@InjectPrisma() private prisma: PrismaClient) {}
 */
export const InjectPrisma = () => Inject('PRISMA');

export type { PrismaClient };
