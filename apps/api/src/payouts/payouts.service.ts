import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { prisma } from '@hbs/prisma';

/** Booking statuses that represent a completed, paid stay eligible for payout. */
const SETTLEABLE_STATUSES = ['PAID', 'CHECKED_IN', 'CHECKED_OUT'] as const;

@Injectable()
export class PayoutsService {
  /**
   * Find every booking that's been paid for, hasn't been refunded, and
   * hasn't already been included in a prior payout — the pool a new
   * settlement batch would be generated from.
   */
  private async findEligibleBookings(hostId: string) {
    return prisma.booking.findMany({
      where: {
        room: { property: { hostId } },
        status: { in: [...SETTLEABLE_STATUSES] },
        payoutId: null,
        payments: { some: { status: 'SUCCESS' } },
      },
      select: { id: true, totalPrice: true, checkOut: true },
    });
  }

  private async computeFee(hostId: string, bookings: { totalPrice: unknown }[]) {
    const host = await prisma.host.findUniqueOrThrow({
      where: { id: hostId },
      select: { billingPlan: true, commissionRate: true },
    });

    const grossAmount = bookings.reduce((sum, b) => sum + Number(b.totalPrice), 0);
    // Subscription-plan hosts pay a flat recurring fee tracked separately
    // (see BillingService) — 0% is deducted per booking under that plan.
    const platformFee =
      host.billingPlan === 'COMMISSION'
        ? Math.round(grossAmount * (Number(host.commissionRate) / 100) * 100) / 100
        : 0;

    return { grossAmount, platformFee, netPayable: Math.round((grossAmount - platformFee) * 100) / 100 };
  }

  /** Preview what a payout would look like right now, without creating one. */
  async getBalance(hostId: string) {
    const bookings = await this.findEligibleBookings(hostId);
    const { grossAmount, platformFee, netPayable } = await this.computeFee(hostId, bookings);

    return {
      eligibleBookingCount: bookings.length,
      grossAmount,
      platformFee,
      netPayable,
    };
  }

  /**
   * Create a PENDING payout batch from every currently-eligible booking.
   *
   * The eligibility read and the claim (setting payoutId) must be atomic
   * with respect to each other — otherwise two concurrent calls for the
   * same host (a double-click, a client retry after a slow response) can
   * both read the same "unclaimed" bookings before either claims them,
   * producing two Payout batches that double-count the same revenue. The
   * booking-creation path solves an equivalent problem with a DB EXCLUDE
   * constraint; there's no equivalent declarative constraint for "a set of
   * rows can only be claimed once across concurrent transactions", so this
   * uses SERIALIZABLE isolation instead — Postgres aborts the loser with a
   * 40001 serialization failure, which gets one retry (mirroring
   * BookingsService's deadlock-retry pattern) before surfacing as a normal
   * "try again" error.
   */
  async generate(hostId: string, attempt = 1): Promise<Awaited<ReturnType<typeof prisma.payout.create>>> {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const bookings = await tx.booking.findMany({
            where: {
              room: { property: { hostId } },
              status: { in: [...SETTLEABLE_STATUSES] },
              payoutId: null,
              payments: { some: { status: 'SUCCESS' } },
            },
            select: { id: true, totalPrice: true, checkOut: true },
          });

          if (bookings.length === 0) {
            throw new BadRequestException('No settled bookings available to pay out');
          }

          const host = await tx.host.findUniqueOrThrow({
            where: { id: hostId },
            select: { billingPlan: true, commissionRate: true },
          });

          const grossAmount = bookings.reduce((sum, b) => sum + Number(b.totalPrice), 0);
          const platformFee =
            host.billingPlan === 'COMMISSION'
              ? Math.round(grossAmount * (Number(host.commissionRate) / 100) * 100) / 100
              : 0;
          const netPayable = Math.round((grossAmount - platformFee) * 100) / 100;
          const checkOutDates = bookings.map((b) => b.checkOut.getTime());

          const created = await tx.payout.create({
            data: {
              hostId,
              periodStart: new Date(Math.min(...checkOutDates)),
              periodEnd: new Date(),
              bookingCount: bookings.length,
              grossAmount,
              platformFee,
              netPayable,
            },
          });

          await tx.booking.updateMany({
            where: { id: { in: bookings.map((b) => b.id) } },
            data: { payoutId: created.id },
          });

          return created;
        },
        { isolationLevel: 'Serializable' },
      );
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Prisma wraps a Postgres serialization failure / deadlock inside an
      // interactive transaction as PrismaClientKnownRequestError code
      // P2034 ("Transaction failed due to a write conflict or a deadlock.
      // Please retry your transaction") — its message does NOT contain
      // "40001" or "could not serialize", so a substring match against
      // those raw Postgres strings never actually matches Prisma's own
      // errors and this retry path was silently dead code. P2034 is the
      // real, documented signal to check for.
      const prismaCode = (error as { code?: string }).code;
      const message = (error as { message?: string }).message ?? '';
      const isSerializationFailure =
        prismaCode === 'P2034' || message.includes('40001') || message.includes('could not serialize');

      if (!isSerializationFailure) {
        throw error;
      }

      // Same retry shape as BookingsService's deadlock retry: a handful of
      // concurrent callers can all lose to SERIALIZABLE in the same round,
      // so one retry isn't always enough — a short jittered backoff and a
      // couple more attempts clears it without the caller ever seeing a
      // raw Postgres error for what's actually a normal contention case.
      if (attempt < 4) {
        await new Promise((resolve) => setTimeout(resolve, 20 + Math.random() * 60));
        return this.generate(hostId, attempt + 1);
      }

      throw new ConflictException(
        'Another payout generation is in progress for this host — please try again in a moment.',
      );
    }
  }

  async listForHost(hostId: string) {
    return prisma.payout.findMany({
      where: { hostId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Admin-wide view across every host — for the payout settlement console. */
  async listAll() {
    return prisma.payout.findMany({
      include: { host: { select: { id: true, name: true, businessName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Operator action: record that a payout batch was actually paid out (e.g. bank transfer). */
  async markPaid(payoutId: string, payoutReference?: string) {
    const payout = await prisma.payout.findUnique({ where: { id: payoutId } });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    if (payout.status === 'PAID') {
      throw new BadRequestException('Payout is already marked as paid');
    }

    return prisma.payout.update({
      where: { id: payoutId },
      data: { status: 'PAID', paidAt: new Date(), payoutReference: payoutReference ?? null },
    });
  }
}
