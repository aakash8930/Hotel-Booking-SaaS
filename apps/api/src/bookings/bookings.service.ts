import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { prisma } from '@hbs/prisma';
import { BookingStatus } from '@prisma/client';
import type { CreateBookingDto } from './dto/create-booking.dto';

/** Duration of the soft-hold: 10 minutes to complete payment. */
const HOLD_DURATION_MS = 10 * 60 * 1000;

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  /**
   * Create a new booking with a soft-hold.
   *
   * This inserts a PENDING booking with a hold_expires_at timestamp.
   * The EXCLUDE constraint guarantees that no two overlapping active
   * bookings can exist for the same room — if another booking already
   * holds these dates, the database rejects this insert outright.
   *
   * @returns The created booking, or throws ConflictException on overlap.
   */
  async create(dto: CreateBookingDto) {
    const checkIn = new Date(dto.checkIn);
    const checkOut = new Date(dto.checkOut);

    // ── Validation ─────────────────────────────────────────────────────
    this.validateDateRange(checkIn, checkOut);

    // ── Fetch room and calculate price ─────────────────────────────────
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

    // Calculate total price: base_price × number_of_nights
    const nights = this.calculateNights(checkIn, checkOut);
    const totalPrice = Number(room.basePrice) * nights;

    // ── Find or create guest ───────────────────────────────────────────
    const guest = await this.findOrCreateGuest(dto);

    // ── Insert booking (EXCLUDE constraint will reject overlaps) ───────
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
          guest: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      this.logger.log(
        `Booking created: ${booking.id} | Room: ${room.name} | ` +
          `${checkIn.toISOString().slice(0, 10)} → ${checkOut.toISOString().slice(0, 10)} | ` +
          `Hold expires: ${holdExpiresAt.toISOString()}`,
      );

      return {
        ...booking,
        nights,
        holdDurationMinutes: HOLD_DURATION_MS / 60_000,
      };
    } catch (error: unknown) {
      // ── EXCLUDE constraint violation ─────────────────────────────────
      // PostgreSQL raises a serialization/exclusion violation when the
      // EXCLUDE USING gist constraint detects overlapping date ranges.
      // Prisma surfaces this as a PrismaClientKnownRequestError with
      // specific error codes.
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
                id: true,
                name: true,
                slug: true,
                address: true,
                city: true,
                state: true,
                checkInTime: true,
                checkOutTime: true,
              },
            },
          },
        },
        guest: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        payments: {
          orderBy: { initiatedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  /**
   * Confirm a booking (transition from PENDING → CONFIRMED).
   * In a real flow, this happens after payment verification.
   */
  async confirm(bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException(
        `Cannot confirm booking with status: ${booking.status}`,
      );
    }

    // Check if hold has expired
    if (booking.holdExpiresAt && booking.holdExpiresAt < new Date()) {
      // Auto-expire the hold
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.EXPIRED },
      });

      throw new BadRequestException(
        'Booking hold has expired. Please create a new booking.',
      );
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CONFIRMED,
        holdExpiresAt: null, // No longer needed
      },
    });

    this.logger.log(`Booking confirmed: ${bookingId}`);
    return updated;
  }

  /**
   * Cancel a booking.
   * Releases the dates so others can book them.
   */
  async cancel(bookingId: string, reason?: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.EXPIRED
    ) {
      throw new BadRequestException('Booking is already cancelled or expired');
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: reason ?? null,
        holdExpiresAt: null,
      },
    });

    this.logger.log(`Booking cancelled: ${bookingId}`);
    return updated;
  }

  /**
   * Get all bookings for a host's properties.
   */
  async findAllForHost(hostId: string) {
    return prisma.booking.findMany({
      where: {
        room: {
          property: { hostId },
        },
      },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            property: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        guest: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
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
      where: {
        room: { propertyId },
      },
      include: {
        room: {
          select: { id: true, name: true },
        },
        guest: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
      orderBy: { checkIn: 'asc' },
    });
  }

  /**
   * Clean up expired holds — called by a scheduled job or manually.
   * Sets PENDING bookings past their hold_expires_at to EXPIRED.
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
      throw new BadRequestException(
        'Check-out date must be after check-in date',
      );
    }

    // Max stay: 90 nights
    const nights = this.calculateNights(checkIn, checkOut);
    if (nights > 90) {
      throw new BadRequestException('Maximum stay is 90 nights');
    }
  }

  private calculateNights(checkIn: Date, checkOut: Date): number {
    const diffTime = checkOut.getTime() - checkIn.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Find an existing guest by email, or create a new one.
   */
  private async findOrCreateGuest(dto: CreateBookingDto) {
    const existing = await prisma.guest.findUnique({
      where: { email: dto.guestEmail.toLowerCase() },
    });

    if (existing) {
      return existing;
    }

    return prisma.guest.create({
      data: {
        email: dto.guestEmail.toLowerCase(),
        name: dto.guestName,
        phone: dto.guestPhone ?? null,
      },
    });
  }

  /**
   * Handle booking creation errors — specifically the EXCLUDE constraint.
   */
  private handleBookingError(error: unknown): never {
    // Prisma error with code P2002 is unique constraint, but EXCLUDE
    // constraints surface differently. Check for the constraint name.
    const err = error as {
      code?: string;
      meta?: { constraint?: string; target?: string };
      message?: string;
    };

    // PostgreSQL exclusion violation (SQLSTATE 23P01)
    // Prisma surfaces this as a raw query error or P2002 with the constraint name
    if (
      err.message?.includes('no_overlapping_bookings') ||
      err.message?.includes('23P01') ||
      err.message?.includes('conflicting key value violates exclusion constraint') ||
      (err.meta?.constraint &&
        err.meta.constraint === 'no_overlapping_bookings')
    ) {
      this.logger.warn(
        `Double-booking attempt rejected by EXCLUDE constraint`,
      );
      throw new ConflictException({
        code: 'ROOM_NOT_AVAILABLE',
        message:
          'This room is not available for the selected dates. Another booking already holds these dates.',
      });
    }

    // Fallback — check if it's any Prisma known error
    if (err.code?.startsWith('P')) {
      this.logger.error(`Prisma error during booking: ${err.message}`, err as unknown as string);
      throw new ConflictException({
        code: 'BOOKING_CONFLICT',
        message: 'Unable to create booking due to a scheduling conflict.',
      });
    }

    // Unknown error
    this.logger.error(`Unexpected error during booking: ${err.message}`, err as unknown as string);
    throw new BadRequestException('Failed to create booking. Please try again.');
  }
}
