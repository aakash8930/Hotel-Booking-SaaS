import { Module, Global } from '@nestjs/common';
import { prisma } from '@hbs/prisma';

/**
 * Global Prisma module — provides the shared PrismaClient instance
 * to all modules via dependency injection.
 */
@Global()
@Module({
  providers: [
    {
      provide: 'PRISMA',
      useValue: prisma,
    },
  ],
  exports: ['PRISMA'],
})
export class PrismaModule {}
