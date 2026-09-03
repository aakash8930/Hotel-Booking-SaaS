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

/** Duration of the soft-hold: 10 minutes to complete payment. */
const HOLD_DURATION_MS = 10 * 60 * 1000;

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  /**
   * Create a new booking with a soft-hold.
   * The EXCLUDE constraint guarantees no overlapping active bookings.
   */
  async create(dto: CreateBookingDto) {
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

    const guest = await this.findOrCreateGuest(dto);
    const holdExpiresAt = new Date(Date.now() + HOLD_DURATION_MS);

    try {
      const booking = await prisma.booking.create({
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

      return { ...booking, nights, holdDurationMinutes: HOLD_DURATION_MS / 60_000 };
    } catch (error: unknown) {
      return this.handleBookingError(error);
    }
  }

  /**
   * Get a booking by ID.
   */
  async findOne(bookingId: string) {
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

    return booking;
  }

  /**
   * Confirm a booking: PENDING → CONFIRMED
   * Uses the state machine for validation.
   *
   * NOTE: In the payment flow, this transition happens inside
   * PaymentsService.initiatePayment(). This endpoint exists
   * for backwards compatibility and testing.
   */
  async confirm(bookingId: string) {
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
   * Cancel a booking — uses state machine to validate transition.
   */
  async cancel(bookingId: string, reason?: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Validate transition using the state machine
    assertCanTransition(booking.status, BookingStatus.CANCELLED);

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: reason ?? null,
        holdExpiresAt: null,
      },
    });

    this.logger.log(`Booking cancelled: ${bookingId} (${booking.status} → CANCELLED)`);
    return updated;
  }

  /**
   * Get all bookings for a host's properties.
   */
  async findAllForHost(hostId: string) {
    return prisma.booking.findMany({
      where: { room: { property: { hostId } } },
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
   */
  async cleanupExpiredHolds(): Promise<number> {
    const result = await prisma.booking.updateMany({
      where: {
        status: BookingStatus.PENDING,
        holdExpiresAt: { lt: new Date() },
      },
      data: { status: BookingStatus.EXPIRED },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired booking holds`);
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
