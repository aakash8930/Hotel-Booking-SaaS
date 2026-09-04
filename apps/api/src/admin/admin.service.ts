import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@hbs/prisma';
import type { BookingStatus, VerificationStatus, PropertyStatus } from '@hbs/prisma';
import { PayoutsService } from '../payouts/payouts.service';
import { PaymentsService } from '../payments/payments.service';

const REVENUE_STATUSES: BookingStatus[] = ['PAID', 'CHECKED_IN', 'CHECKED_OUT'];

@Injectable()
export class AdminService {
  constructor(
    private readonly payouts: PayoutsService,
    private readonly payments: PaymentsService,
  ) {}

  // ── Platform stats ─────────────────────────────────────────────────────

  async getStats() {
    const [
      hostCount,
      guestCount,
      activeProperties,
      totalProperties,
      revenueBookings,
      totalBookings,
      pendingVerifications,
      pendingPayouts,
      reportedReviews,
    ] = await Promise.all([
      prisma.host.count(),
      prisma.guest.count(),
      prisma.property.count({ where: { status: 'ACTIVE' } }),
      prisma.property.count(),
      prisma.booking.findMany({ where: { status: { in: REVENUE_STATUSES } }, select: { totalPrice: true } }),
      prisma.booking.count(),
      prisma.host.count({ where: { verificationStatus: 'PENDING' } }),
      prisma.payout.count({ where: { status: 'PENDING' } }),
      prisma.review.count({ where: { reportCount: { gt: 0 }, hiddenAt: null } }),
    ]);

    return {
      hostCount,
      guestCount,
      activeProperties,
      totalProperties,
      totalRevenue: revenueBookings.reduce((sum, b) => sum + Number(b.totalPrice), 0),
      totalBookings,
      pendingVerifications,
      pendingPayouts,
      reportedReviews,
    };
  }

  // ── Hosts ───────────────────────────────────────────────────────────────

  async listHosts(verificationStatus?: VerificationStatus) {
    return prisma.host.findMany({
      where: verificationStatus ? { verificationStatus } : undefined,
      select: {
        id: true,
        email: true,
        name: true,
        businessName: true,
        isActive: true,
        verificationStatus: true,
        verificationNote: true,
        verifiedAt: true,
        createdAt: true,
        _count: { select: { properties: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private readonly hostSummarySelect = {
    id: true,
    email: true,
    name: true,
    businessName: true,
    isActive: true,
    verificationStatus: true,
    verificationNote: true,
    verifiedAt: true,
    createdAt: true,
  } as const;

  async setHostActive(hostId: string, isActive: boolean) {
    await this.assertHostExists(hostId);
    return prisma.host.update({
      where: { id: hostId },
      data: { isActive },
      select: this.hostSummarySelect,
    });
  }

  async reviewHostVerification(hostId: string, decision: 'VERIFIED' | 'REJECTED', note?: string) {
    await this.assertHostExists(hostId);
    return prisma.host.update({
      where: { id: hostId },
      data: {
        verificationStatus: decision,
        verificationNote: note ?? null,
        verifiedAt: decision === 'VERIFIED' ? new Date() : null,
      },
      select: this.hostSummarySelect,
    });
  }

  private async assertHostExists(hostId: string) {
    const host = await prisma.host.findUnique({ where: { id: hostId } });
    if (!host) throw new NotFoundException('Host not found');
  }

  // ── Properties ──────────────────────────────────────────────────────────

  async listProperties(status?: PropertyStatus) {
    return prisma.property.findMany({
      where: status ? { status } : undefined,
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        state: true,
        status: true,
        createdAt: true,
        host: { select: { id: true, name: true, email: true, verificationStatus: true } },
        _count: { select: { rooms: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async setPropertyStatus(propertyId: string, status: PropertyStatus) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundException('Property not found');
    return prisma.property.update({ where: { id: propertyId }, data: { status } });
  }

  // ── Reviews ─────────────────────────────────────────────────────────────

  async listReviews(filter?: 'reported' | 'hidden') {
    return prisma.review.findMany({
      where:
        filter === 'reported'
          ? { reportCount: { gt: 0 }, hiddenAt: null }
          : filter === 'hidden'
            ? { hiddenAt: { not: null } }
            : undefined,
      include: {
        guest: { select: { name: true, email: true } },
        property: { select: { name: true, slug: true } },
      },
      orderBy: [{ reportCount: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async setReviewHidden(reviewId: string, hidden: boolean, reason?: string) {
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');

    return prisma.review.update({
      where: { id: reviewId },
      data: hidden
        ? { hiddenAt: new Date(), hiddenReason: reason ?? 'Hidden by admin' }
        : { hiddenAt: null, hiddenReason: null },
    });
  }

  // ── Bookings (dispute lookup) ────────────────────────────────────────────

  async searchBookings(query?: string) {
    if (!query) {
      return prisma.booking.findMany({
        include: {
          guest: { select: { name: true, email: true } },
          room: { select: { name: true, property: { select: { name: true, host: { select: { name: true } } } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 25,
      });
    }

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    return prisma.booking.findMany({
      where: {
        OR: [
          ...(UUID_RE.test(query) ? [{ id: query }] : []),
          { guest: { email: { contains: query, mode: 'insensitive' } } },
          { guest: { name: { contains: query, mode: 'insensitive' } } },
          { room: { property: { host: { email: { contains: query, mode: 'insensitive' } } } } },
        ],
      },
      include: {
        guest: { select: { name: true, email: true } },
        room: { select: { name: true, property: { select: { name: true, host: { select: { name: true } } } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });
  }

  async transitionBooking(bookingId: string, targetStatus: BookingStatus, reason?: string) {
    return this.payments.transitionBooking(bookingId, targetStatus, reason);
  }

  // ── Payouts ─────────────────────────────────────────────────────────────

  async listPayouts() {
    return this.payouts.listAll();
  }

  async markPayoutPaid(payoutId: string, payoutReference?: string) {
    return this.payouts.markPaid(payoutId, payoutReference);
  }
}
