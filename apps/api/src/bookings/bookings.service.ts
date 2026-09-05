import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { prisma } from '@hbs/prisma';
import { BookingStatus } from '@hbs/prisma';
import type { CreateBookingDto } from './dto/create-booking.dto';
import { assertCanTransition } from '../common/booking-state';
import { calculateRefund } from '../common/cancellation-policy';
import { RealtimeService } from '../realtime/realtime.service';
import { PaymentsService } from '../payments/payments.service';
import { WhatsAppService } from '../payments/whatsapp.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

/** Duration of the soft-hold: 10 minutes to complete payment. */
const HOLD_DURATION_MS = 10 * 60 * 1000;

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly realtime: RealtimeService,
    private readonly payments: PaymentsService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  /**
   * Create a new booking with a soft-hold.
   * The EXCLUDE constraint guarantees no overlapping active bookings.
   */
  async create(dto: CreateBookingDto, authenticatedGuestId?: string) {
    const checkIn = new Date(dto.checkIn);
    const checkOut = new Date(dto.checkOut);

    this.validateDateRange(checkIn, checkOut);

    const room = await prisma.room.findUnique({
      where: { id: dto.roomId },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            slug: true,
            checkInTime: true,
            checkOutTime: true,
          },
        },
      },
    });

    if (!room || !room.isActive) {
      throw new NotFoundException('Room not found or is inactive');
    }

    if (dto.guests > room.capacity) {
      throw new BadRequestException(
        `Room capacity is ${room.capacity}, but ${dto.guests} guests requested`,
      );
    }

    const nights = this.calculateNights(checkIn, checkOut);
    const totalPrice = Number(room.basePrice) * nights;

    const guest = authenticatedGuestId
      ? await prisma.guest.findUniqueOrThrow({ where: { id: authenticatedGuestId } })
      : await this.findOrCreateGuest(dto);
    const holdExpiresAt = new Date(Date.now() + HOLD_DURATION_MS);

    try {
      const rawAccessToken = randomBytes(32).toString('base64url');
      const accessTokenHash = createHash('sha256').update(rawAccessToken).digest('hex');

      const booking = await this.createBookingWithDeadlockRetry({
        data: {
          roomId: dto.roomId,
          guestId: guest.id,
          checkIn,
          checkOut,
          guests: dto.guests,
          status: BookingStatus.PENDING,
          holdExpiresAt,
          totalPrice,
          currency: room.currency,
          specialRequests: dto.specialRequests ?? null,
          accessTokenHash,
        },
        include: {
          room: {
            select: {
              id: true,
              name: true,
              basePrice: true,
              property: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  checkInTime: true,
                  checkOutTime: true,
                },
              },
            },
          },
          guest: { select: { id: true, name: true, email: true } },
        },
      });

      this.logger.log(
        `Booking created: ${booking.id} | Room: ${room.name} | ` +
          `${checkIn.toISOString().slice(0, 10)} → ${checkOut.toISOString().slice(0, 10)} | ` +
          `Hold expires: ${holdExpiresAt.toISOString()}`,
      );

      void this.realtime.publish('room.held', room.id, room.property.id, {
        bookingId: booking.id,
        checkIn: dto.checkIn,
        checkOut: dto.checkOut,
      });

      const { accessTokenHash: _accessTokenHash, ...safeBooking } = booking as typeof booking & { accessTokenHash?: string | null };
      return { ...safeBooking, nights, holdDurationMinutes: HOLD_DURATION_MS / 60_000, accessToken: rawAccessToken };
    } catch (error: unknown) {
      return this.handleBookingError(error);
    }
  }

  /**
   * Get a booking by ID. Anonymous access requires the opaque booking capability token.
   */
  async findOne(bookingId: string, accessToken?: string) {
    await this.assertBookingAccess(bookingId, accessToken);
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            basePrice: true,
            images: true,
            property: {
              select: {
                id: true, name: true, slug: true, address: true,
                city: true, state: true, checkInTime: true, checkOutTime: true,
              },
            },
          },
        },
        guest: { select: { id: true, name: true, email: true, phone: true } },
        payments: { orderBy: { initiatedAt: 'desc' }, take: 1 },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const { accessTokenHash: _accessTokenHash, ...safeBooking } = booking as typeof booking & { accessTokenHash?: string | null };
    return safeBooking;
  }

  /**
   * Confirm a booking: PENDING → CONFIRMED
   * Uses the state machine for validation.
   *
   * NOTE: In the payment flow, this transition happens inside
   * PaymentsService.initiatePayment(). This endpoint exists
   * for backwards compatibility and testing.
   */
  async confirm(bookingId: string, accessToken?: string) {
    await this.assertBookingAccess(bookingId, accessToken);
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Validate transition using the state machine
    assertCanTransition(booking.status, BookingStatus.CONFIRMED);

    // Check if hold has expired
    if (booking.holdExpiresAt && booking.holdExpiresAt < new Date()) {
      // Validate and perform PENDING → EXPIRED
      assertCanTransition(booking.status, BookingStatus.EXPIRED);
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.EXPIRED },
      });
      throw new BadRequestException('Booking hold has expired. Please create a new booking.');
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CONFIRMED,
        holdExpiresAt: null,
      },
    });

    this.logger.log(`Booking confirmed: ${bookingId} (${booking.status} → CONFIRMED)`);
    return updated;
  }

  /**
   * Preview the refund a cancellation would produce right now, without
   * actually cancelling — lets the UI show "you'll get ₹X back" before
   * the guest confirms.
   */
  async previewCancellation(bookingId: string, accessToken?: string) {
    await this.assertBookingAccess(bookingId, accessToken);
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { room: { select: { property: { select: { cancellationPolicy: true } } } } },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return calculateRefund(booking.room.property.cancellationPolicy, booking.checkIn, Number(booking.totalPrice));
  }

  /**
   * Cancel a booking — uses state machine to validate transition.
   */
  async cancel(bookingId: string, reason?: string, accessToken?: string) {
    await this.assertBookingAccess(bookingId, accessToken);
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        room: {
          select: {
            id: true,
            propertyId: true,
            property: { select: { name: true, cancellationPolicy: true } },
          },
        },
        guest: { select: { name: true, phone: true } },
        payments: { where: { status: 'SUCCESS' }, orderBy: { completedAt: 'desc' }, take: 1 },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Validate transition using the state machine
    assertCanTransition(booking.status, BookingStatus.CANCELLED);

    const refund = calculateRefund(
      booking.room.property.cancellationPolicy,
      booking.checkIn,
      Number(booking.totalPrice),
    );

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: reason ?? null,
        holdExpiresAt: null,
      },
    });

    // Can't fold this into the DB transaction above — it calls out to
    // PhonePe. The cancellation itself is the authoritative state change;
    // if the refund call fails, the booking still stays cancelled and this
    // just gets logged, matching how the webhook handler already treats
    // external payment calls as separate from booking-state commits.
    if (refund.refundAmount > 0 && booking.payments[0]) {
      await this.payments.refundPayment(bookingId, refund.refundAmount);
    }

    void this.whatsapp.sendCancellationNotice({
      guestPhone: booking.guest.phone,
      guestName: booking.guest.name,
      propertyName: booking.room.property.name,
      refundAmount: refund.refundAmount,
      currency: updated.currency,
    });

    this.logger.log(
      `Booking cancelled: ${bookingId} (${booking.status} → CANCELLED), ` +
        `refund: ${refund.refundPercent}% (₹${refund.refundAmount})`,
    );

    void this.realtime.publish('room.released', booking.room.id, booking.room.propertyId, {
      bookingId,
      reason: 'cancelled',
    });

    return { ...updated, refund };
  }

  /** Verify the opaque anonymous-booking capability token. */
  private async assertBookingAccess(bookingId: string, accessToken?: string): Promise<void> {
    if (!accessToken) throw new ForbiddenException('Booking access token required');
    const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { accessTokenHash: true } });
    if (!booking?.accessTokenHash) throw new ForbiddenException('Invalid booking access token');
    const supplied = Buffer.from(createHash('sha256').update(accessToken).digest('hex'));
    const stored = Buffer.from(booking.accessTokenHash);
    if (supplied.length !== stored.length || !timingSafeEqual(supplied, stored)) {
      throw new ForbiddenException('Invalid booking access token');
    }
  }

  /**
   * Get all bookings for a host's properties.
   */
  async findAllForHost(hostId: string, filters?: { status?: BookingStatus; propertyId?: string }) {
    const [host, bookings] = await Promise.all([
      prisma.host.findUnique({
        where: { id: hostId },
        select: { billingPlan: true, commissionRate: true },
      }),
      prisma.booking.findMany({
        where: {
          room: {
            property: {
              hostId,
              ...(filters?.propertyId ? { id: filters.propertyId } : {}),
            },
          },
          ...(filters?.status ? { status: filters.status } : {}),
        },
        include: {
          room: {
            select: {
              id: true, name: true,
              property: { select: { id: true, name: true } },
            },
          },
          guest: { select: { id: true, name: true, email: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Platform fee is computed and shown here per booking; the actual
    // settlement happens in batches via PayoutsService, which recomputes
    // this same fee at generation time from the bookings it claims.
    return bookings.map((booking) => ({
      ...booking,
      platformFee:
        host?.billingPlan === 'COMMISSION'
          ? Math.round(Number(booking.totalPrice) * (Number(host.commissionRate) / 100) * 100) / 100
          : 0,
    }));
  }

  /**
   * Summary stats for the host dashboard.
   */
  async getAnalytics(hostId: string) {
    const revenueStatuses: BookingStatus[] = [
      BookingStatus.PAID,
      BookingStatus.CHECKED_IN,
      BookingStatus.CHECKED_OUT,
    ];
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [revenueBookings, upcomingCheckIns, propertyCount, roomCount, ratingAgg] = await Promise.all([
      prisma.booking.findMany({
        where: { room: { property: { hostId } }, status: { in: revenueStatuses } },
        select: { totalPrice: true },
      }),
      prisma.booking.count({
        where: {
          room: { property: { hostId } },
          status: { in: [BookingStatus.PAID, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
          checkIn: { gte: now, lte: weekFromNow },
        },
      }),
      prisma.property.count({ where: { hostId, status: 'ACTIVE' } }),
      prisma.room.count({ where: { property: { hostId }, isActive: true } }),
      prisma.review.aggregate({
        where: { property: { hostId } },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    return {
      totalRevenue: revenueBookings.reduce((sum, b) => sum + Number(b.totalPrice), 0),
      totalBookings: revenueBookings.length,
      upcomingCheckIns,
      activeProperties: propertyCount,
      activeRooms: roomCount,
      averageRating: ratingAgg._avg.rating ? Math.round(ratingAgg._avg.rating * 10) / 10 : null,
      reviewCount: ratingAgg._count.rating,
    };
  }

  /**
   * Get all bookings made by a logged-in guest ("My trips").
   */
  async findAllForGuest(guestId: string) {
    return prisma.booking.findMany({
      where: { guestId },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            property: { select: { id: true, name: true, slug: true, city: true, state: true } },
          },
        },
        review: { select: { id: true, rating: true } },
      },
      orderBy: { checkIn: 'desc' },
    });
  }

  /**
   * Get bookings for a specific property (host must own it).
   */
  async findAllForProperty(hostId: string, propertyId: string) {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.hostId !== hostId) {
      throw new ForbiddenException('You do not own this property');
    }

    return prisma.booking.findMany({
      where: { room: { propertyId } },
      include: {
        room: { select: { id: true, name: true } },
        guest: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { checkIn: 'asc' },
    });
  }

  /**
   * Clean up expired holds.
   * Uses state machine to validate PENDING → EXPIRED.
   *
   * Runs automatically every minute (soft-hold duration is 10 minutes,
   * so a 1-minute cadence keeps the staleness window small without
   * hammering the database). The host-facing admin endpoint that calls
   * this directly still works too, for manual/on-demand cleanup.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async cleanupExpiredHolds(): Promise<number> {
    // updateMany doesn't return the affected rows, and each expired hold
    // needs to publish a room.released event — so fetch first, then update.
    const expired = await prisma.booking.findMany({
      where: {
        status: BookingStatus.PENDING,
        holdExpiresAt: { lt: new Date() },
      },
      select: { id: true, room: { select: { id: true, propertyId: true } } },
    });

    if (expired.length === 0) return 0;

    const result = await prisma.booking.updateMany({
      where: { id: { in: expired.map((b) => b.id) } },
      data: { status: BookingStatus.EXPIRED },
    });

    this.logger.log(`Cleaned up ${result.count} expired booking holds`);

    for (const booking of expired) {
      void this.realtime.publish('room.released', booking.room.id, booking.room.propertyId, {
        bookingId: booking.id,
        reason: 'expired',
      });
    }

    return result.count;
  }

  // ── Private helpers ────────────────────────────────────────────────────

  private validateDateRange(checkIn: Date, checkOut: Date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkIn < today) {
      throw new BadRequestException('Check-in date must be in the future');
    }

    if (checkOut <= checkIn) {
      throw new BadRequestException('Check-out date must be after check-in date');
    }

    const nights = this.calculateNights(checkIn, checkOut);
    if (nights > 90) {
      throw new BadRequestException('Maximum stay is 90 nights');
    }
  }

  private calculateNights(checkIn: Date, checkOut: Date): number {
    return Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  }

  private async findOrCreateGuest(dto: CreateBookingDto) {
    const existing = await prisma.guest.findUnique({
      where: { email: dto.guestEmail.toLowerCase() },
    });

    if (existing) return existing;

    return prisma.guest.create({
      data: {
        email: dto.guestEmail.toLowerCase(),
        name: dto.guestName,
        phone: dto.guestPhone ?? null,
      },
    });
  }

  /**
   * Under heavy concurrent contention for the same room/dates, two distinct
   * transient failure modes show up, neither of which means the room is
   * actually unavailable:
   *   - A genuine Postgres deadlock (40P01) while several transactions race
   *     to take locks for the EXCLUDE constraint's overlap check.
   *   - Prisma's connection pool running out under a burst of simultaneous
   *     requests (P2024, "Timed out fetching a new connection from the
   *     connection pool") — distinct from a deadlock, but equally resolved
   *     by backing off and retrying once a connection frees up.
   * Both are distinct from an exclusion violation, which is deterministic
   * and not retryable — that's handled separately in handleBookingError.
   * A 30-way concurrent load test (apps/api/test/concurrency-load.test.ts)
   * against a single contended room found 3 attempts insufficient — some
   * requests kept losing the retry race and fell through to a raw,
   * unhelpful error instead of a clean "try again" response. 6 attempts
   * with jittered backoff clears it.
   */
  private async createBookingWithDeadlockRetry(
    args: Parameters<typeof prisma.booking.create>[0],
    attempt = 1,
  ): Promise<Awaited<ReturnType<typeof prisma.booking.create>>> {
    try {
      return await prisma.booking.create(args);
    } catch (error: unknown) {
      const prismaCode = (error as { code?: string }).code;
      const message = (error as { message?: string }).message ?? '';
      const isRetryable =
        prismaCode === 'P2024' ||
        message.includes('40P01') ||
        message.includes('deadlock detected') ||
        message.includes('Timed out fetching a new connection');

      if (isRetryable && attempt < 6) {
        await new Promise((resolve) => setTimeout(resolve, 20 + Math.random() * 80));
        return this.createBookingWithDeadlockRetry(args, attempt + 1);
      }

      throw error;
    }
  }

  private handleBookingError(error: unknown): never {
    const err = error as {
      code?: string;
      meta?: { constraint?: string; target?: string };
      message?: string;
    };

    if (
      err.message?.includes('no_overlapping_bookings') ||
      err.message?.includes('23P01') ||
      err.message?.includes('conflicting key value violates exclusion constraint') ||
      (err.meta?.constraint && err.meta.constraint === 'no_overlapping_bookings')
    ) {
      this.logger.warn('Double-booking attempt rejected by EXCLUDE constraint');
      throw new ConflictException({
        code: 'ROOM_NOT_AVAILABLE',
        message: 'This room is not available for the selected dates.',
      });
    }

    if (err.code?.startsWith('P')) {
      this.logger.error(`Prisma error during booking: ${err.message}`, err as unknown as string);
      throw new ConflictException({
        code: 'BOOKING_CONFLICT',
        message: 'Unable to create booking due to a scheduling conflict.',
      });
    }

    this.logger.error(`Unexpected error during booking: ${err.message}`, err as unknown as string);
    throw new BadRequestException('Failed to create booking. Please try again.');
  }
}
