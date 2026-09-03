import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { prisma } from '@hbs/prisma';
import type { CreatePropertyDto } from './dto/create-property.dto';
import type { UpdatePropertyDto } from './dto/update-property.dto';

@Injectable()
export class PropertiesService {
  /**
   * Create a new property for a host.
   */
  async create(hostId: string, dto: CreatePropertyDto) {
    // Generate slug from name
    const slug = this.generateSlug(dto.name);

    const property = await prisma.property.create({
      data: {
        hostId,
        name: dto.name,
        slug,
        description: dto.description ?? null,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        latitude: dto.latitude ? parseFloat(dto.latitude.toString()) : null,
        longitude: dto.longitude ? parseFloat(dto.longitude.toString()) : null,
        coverImage: dto.coverImage ?? null,
        status: dto.status ?? 'DRAFT',
        checkInTime: dto.checkInTime ?? '14:00',
        checkOutTime: dto.checkOutTime ?? '11:00',
        rules: dto.rules ? JSON.stringify(dto.rules) : null,
      },
    });

    return property;
  }

  /**
   * Get all properties for a host.
   */
  async findAllByHost(hostId: string) {
    return prisma.property.findMany({
      where: { hostId },
      include: {
        rooms: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: { rooms: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single property by ID (host must own it).
   */
  async findOne(hostId: string, propertyId: string) {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        rooms: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: { rooms: true },
        },
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.hostId !== hostId) {
      throw new ForbiddenException('You do not own this property');
    }

    return property;
  }

  /**
   * Get a property by slug (public, for guest-facing pages).
   */
  async findOneBySlug(slug: string) {
    const property = await prisma.property.findUnique({
      where: { slug, status: 'ACTIVE' },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            businessName: true,
          },
        },
        rooms: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    return property;
  }

  /**
   * Update a property.
   */
  async update(hostId: string, propertyId: string, dto: UpdatePropertyDto) {
    // Verify ownership
    await this.findOne(hostId, propertyId);

    const property = await prisma.property.update({
      where: { id: propertyId },
      data: {
        name: dto.name,
        description: dto.description,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        latitude: dto.latitude ? parseFloat(dto.latitude.toString()) : undefined,
        longitude: dto.longitude ? parseFloat(dto.longitude.toString()) : undefined,
        coverImage: dto.coverImage,
        status: dto.status,
        checkInTime: dto.checkInTime,
        checkOutTime: dto.checkOutTime,
        rules: dto.rules ? JSON.stringify(dto.rules) : undefined,
      },
    });

    return property;
  }

  /**
   * Delete a property (soft delete by setting status to SUSPENDED).
   */
  async remove(hostId: string, propertyId: string) {
    // Verify ownership
    await this.findOne(hostId, propertyId);

    await prisma.property.update({
      where: { id: propertyId },
      data: { status: 'SUSPENDED' },
    });

    return { success: true, message: 'Property suspended' };
  }

  /**
   * Generate a URL-friendly slug from a property name.
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .concat('-', Date.now().toString(36));
  }
}
