import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Shared Prisma client singleton.
 *
 * In development, the client is cached on globalThis to survive
 * hot-reload cycles without exhausting database connections.
 */
export const prisma = (() => {
  try {
    const client =
      globalForPrisma.prisma ??
      new PrismaClient({
        log:
          process.env.NODE_ENV === 'development'
            ? ['query', 'error', 'warn']
            : ['error'],
      });

    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = client;
    }

    return client;
  } catch (error) {
    console.error('Failed to initialize Prisma client:', error);
    throw error;
  }
})();

export * from '@prisma/client';
