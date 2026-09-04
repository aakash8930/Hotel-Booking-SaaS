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

    // Fetch properties with rooms — filtering (rating, availability) and
    // sorting happen in-memory below, so pagination applies after that,
    // not at the DB query level. Fine at this data scale (pilot stage);
    // would need to move to a DB-level query if the catalog grows large.
    const properties = await prisma.property.findMany({
      where,
      include: {
        rooms: {
          where: { isActive: true },
          orderBy: { basePrice: 'asc' },
        },
        host: {
          select: { name: true, businessName: true, verificationStatus: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const ratings = await prisma.review.groupBy({
      by: ['propertyId'],
      where: { propertyId: { in: properties.map((p) => p.id) }, hiddenAt: null },
      _avg: { rating: true },
      _count: { rating: true },
    });
    const ratingByProperty = new Map(
      ratings.map((r) => [
        r.propertyId,
        {
          averageRating: r._avg.rating ? Math.round(r._avg.rating * 10) / 10 : null,
          reviewCount: r._count.rating,
        },
      ]),
    );

    const requestedAmenities = dto.amenities?.map((a) => a.toLowerCase()) ?? [];

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

            // Every requested amenity must be present on the room
            if (requestedAmenities.length > 0) {
              const roomAmenities = room.amenities.map((a) => a.toLowerCase());
              const hasAll = requestedAmenities.every((a) => roomAmenities.includes(a));
              if (!hasAll) return null;
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

        const rating = ratingByProperty.get(property.id) ?? { averageRating: null, reviewCount: 0 };

        if (dto.minRating && (rating.averageRating ?? 0) < dto.minRating) {
          return null;
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
          averageRating: rating.averageRating,
          reviewCount: rating.reviewCount,
          createdAt: property.createdAt,
        };
      }),
    );

    let availableProperties = results.filter((p): p is NonNullable<typeof p> => p !== null);

    availableProperties = this.sortResults(availableProperties, dto.sortBy);

    const total = availableProperties.length;
    const offset = dto.offset ?? 0;
    const limit = dto.limit ?? 20;
    const page = availableProperties.slice(offset, offset + limit);

    this.logger.log(
      `Search: city=${dto.city ?? '*'}, dates=${dto.checkIn}→${dto.checkOut}, ` +
        `results=${total}`,
    );

    return {
      properties: page,
      search: {
        checkIn: dto.checkIn,
        checkOut: dto.checkOut,
        guests: dto.guests ?? null,
        city: dto.city ?? null,
        state: dto.state ?? null,
        nights: this.calculateNights(checkIn, checkOut),
      },
      total,
    };
  }

  private sortResults<
    T extends { lowestPrice: number; averageRating: number | null; createdAt: Date },
  >(results: T[], sortBy?: string): T[] {
    const sorted = [...results];
    switch (sortBy) {
      case 'price_asc':
        return sorted.sort((a, b) => a.lowestPrice - b.lowestPrice);
      case 'price_desc':
        return sorted.sort((a, b) => b.lowestPrice - a.lowestPrice);
      case 'rating_desc':
        return sorted.sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0));
      case 'newest':
        return sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      default:
        return sorted;
    }
  }

  private calculateNights(checkIn: Date, checkOut: Date): number {
    return Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );
  }
}
