import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { prisma } from '@hbs/prisma';
import type { CreateRoomDto } from './dto/create-room.dto';
import type { UpdateRoomDto } from './dto/update-room.dto';

@Injectable()
export class RoomsService {
  /**
   * Create a new room for a property.
   * Verifies the host owns the property.
   */
  async create(hostId: string, propertyId: string, dto: CreateRoomDto) {
    // Verify property ownership
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.hostId !== hostId) {
      throw new ForbiddenException('You do not own this property');
    }

    const room = await prisma.room.create({
      data: {
        propertyId,
        name: dto.name,
        description: dto.description ?? null,
        capacity: dto.capacity ?? 2,
        basePrice: parseFloat(dto.basePrice.toString()),
        currency: dto.currency ?? 'INR',
        images: dto.images ?? [],
        amenities: dto.amenities ?? [],
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    return room;
  }

  /**
   * Get all rooms for a property (host must own it).
   */
  async findAll(hostId: string, propertyId: string) {
    // Verify ownership
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.hostId !== hostId) {
      throw new ForbiddenException('You do not own this property');
    }

    return prisma.room.findMany({
      where: { propertyId },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: {
            bookings: {
              where: {
                status: { in: ['CONFIRMED', 'PAID', 'CHECKED_IN'] },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get a single room by ID.
   */
  async findOne(hostId: string, propertyId: string, roomId: string) {
    const room = await prisma.room.findFirst({
      where: { id: roomId, propertyId },
      include: {
        property: {
          select: { hostId: true },
        },
        bookings: {
          where: {
            status: { in: ['PENDING', 'CONFIRMED', 'PAID', 'CHECKED_IN'] },
          },
          select: {
            id: true,
            checkIn: true,
            checkOut: true,
            status: true,
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (room.property.hostId !== hostId) {
      throw new ForbiddenException('You do not own this room');
    }

    return room;
  }

  /**
   * Update a room.
   */
  async update(
    hostId: string,
    propertyId: string,
    roomId: string,
    dto: UpdateRoomDto,
  ) {
    // Verify room exists and host owns it
    await this.findOne(hostId, propertyId, roomId);

    // Build update data, filtering out undefined values
    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.capacity !== undefined) updateData.capacity = dto.capacity;
    if (dto.basePrice !== undefined) updateData.basePrice = parseFloat(dto.basePrice.toString());
    if (dto.currency !== undefined) updateData.currency = dto.currency;
    if (dto.images !== undefined) updateData.images = dto.images;
    if (dto.amenities !== undefined) updateData.amenities = dto.amenities;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.sortOrder !== undefined) updateData.sortOrder = dto.sortOrder;

    const room = await prisma.room.update({
      where: { id: roomId },
      data: updateData,
    });

    return room;
  }

  /**
   * Delete (deactivate) a room.
   */
  async remove(hostId: string, propertyId: string, roomId: string) {
    // Verify room exists and host owns it
    await this.findOne(hostId, propertyId, roomId);

    await prisma.room.update({
      where: { id: roomId },
      data: { isActive: false },
    });

    return { success: true, message: 'Room deactivated' };
  }

  /**
   * Check room availability for a date range.
   * Returns true if the room has no overlapping active bookings.
   */
  async checkAvailability(roomId: string, checkIn: Date, checkOut: Date) {
    const overlappingBookings = await prisma.booking.count({
      where: {
        roomId,
        status: { in: ['PENDING', 'CONFIRMED', 'PAID', 'CHECKED_IN'] },
        OR: [
          {
            checkIn: { lt: checkOut },
            checkOut: { gt: checkIn },
          },
        ],
      },
    });

    return overlappingBookings === 0;
  }

  /**
   * Get all bookings for a room within a date range.
   */
  async getBookings(
    hostId: string,
    propertyId: string,
    roomId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    // Verify room exists and host owns it
    await this.findOne(hostId, propertyId, roomId);

    const where: any = { roomId };

    if (startDate || endDate) {
      where.OR = [];
      if (startDate) {
        where.OR.push({ checkOut: { gt: startDate } });
      }
      if (endDate) {
        where.OR.push({ checkIn: { lt: endDate } });
      }
    }

    return prisma.booking.findMany({
      where,
      include: {
        guest: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { checkIn: 'asc' },
    });
  }
}
