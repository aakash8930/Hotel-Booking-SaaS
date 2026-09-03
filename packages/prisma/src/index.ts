import { PrismaClient, Prisma } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma's Decimal serializes to a string by default (`Decimal.toJSON()`
 * returns `.toString()`), which silently disagrees with the @hbs/shared
 * TypeScript contracts that declare these fields as `number`. At the
 * precision used here (currency to 2dp, lat/lng to 8dp) there's no
 * float-safety concern, so every Decimal field is serialized as a plain
 * JSON number instead — applied once, globally, rather than requiring
 * every service to remember to call Number() individually.
 */
(Prisma.Decimal.prototype as unknown as { toJSON(): number }).toJSON = function (
  this: InstanceType<typeof Prisma.Decimal>,
) {
  return this.toNumber();
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
