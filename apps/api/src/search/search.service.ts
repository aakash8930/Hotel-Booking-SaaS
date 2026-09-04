import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { prisma } from '@hbs/prisma';
import type { SearchDto } from './search.dto';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  /**
   * Search for available properties and rooms.
   *
   * Returns properties with their rooms that have availability for the
   * requested date range. Filters by city, state, capacity, and price.
   */
  async search(dto: SearchDto) {
    const checkIn = new Date(dto.checkIn);
    const checkOut = new Date(dto.checkOut);

    // Validate dates
    if (checkIn >= checkOut) {
      throw new BadRequestException('Check-out must be after check-in');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (checkIn < today) {
      throw new BadRequestException('Check-in must be in the future');
    }

    // Build the query: find active properties with available rooms
    const where: any = {
      status: 'ACTIVE',
    };

    if (dto.city) {
      where.city = { contains: dto.city, mode: 'insensitive' };
    }

    if (dto.state) {
      where.state = { contains: dto.state, mode: 'insensitive' };
    }

    // Fetch properties with rooms
    const properties = await prisma.property.findMany({
      where,
      include: {
        rooms: {
          where: { isActive: true },
          orderBy: { basePrice: 'asc' },
        },
        host: {
          select: { name: true, businessName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: dto.limit ?? 20,
      skip: dto.offset ?? 0,
    });

    // For each room, check availability for the requested dates
    const results = await Promise.all(
      properties.map(async (property) => {
        const availableRooms = await Promise.all(
          property.rooms.map(async (room) => {
            // Check capacity
            if (dto.guests && room.capacity < dto.guests) {
              return null;
            }

            // Check price range
            if (dto.maxPrice && Number(room.basePrice) > dto.maxPrice) {
              return null;
            }

            if (dto.minPrice && Number(room.basePrice) < dto.minPrice) {
              return null;
            }

            // Check availability: no overlapping active bookings
            const overlappingBookings = await prisma.booking.count({
              where: {
                roomId: room.id,
                status: {
                  in: ['PENDING', 'CONFIRMED', 'PAID', 'CHECKED_IN'],
                },
                // Overlap condition: booking starts before checkout AND ends after checkin
                checkIn: { lt: checkOut },
                checkOut: { gt: checkIn },
              },
            });

            if (overlappingBookings > 0) {
              return null; // Room is not available
            }

            return {
              ...room,
              basePrice: Number(room.basePrice),
              totalPrice: Number(room.basePrice) * this.calculateNights(checkIn, checkOut),
              isAvailable: true,
            };
          }),
        );

        const rooms = availableRooms.filter(Boolean);

        if (rooms.length === 0) {
          return null; // No available rooms in this property
        }

        return {
          id: property.id,
          name: property.name,
          slug: property.slug,
          description: property.description,
          city: property.city,
          state: property.state,
          address: property.address,
          coverImage: property.coverImage,
          checkInTime: property.checkInTime,
          checkOutTime: property.checkOutTime,
          host: property.host,
          rooms,
          lowestPrice: Math.min(...rooms.map((r: any) => r.basePrice)),
        };
      }),
    );

    const availableProperties = results.filter(Boolean);

    this.logger.log(
      `Search: city=${dto.city ?? '*'}, dates=${dto.checkIn}→${dto.checkOut}, ` +
        `results=${availableProperties.length}`,
    );

    return {
      properties: availableProperties,
      search: {
        checkIn: dto.checkIn,
        checkOut: dto.checkOut,
        guests: dto.guests ?? null,
        city: dto.city ?? null,
        state: dto.state ?? null,
        nights: this.calculateNights(checkIn, checkOut),
      },
      total: availableProperties.length,
    };
  }

  private calculateNights(checkIn: Date, checkOut: Date): number {
    return Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );
  }
}
