import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('host/properties/:propertyId/rooms')
@UseGuards(JwtAuthGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  /**
   * Create a new room.
   */
  @Post()
  async create(
    @CurrentUser('sub') hostId: string,
    @Param('propertyId') propertyId: string,
    @Body() dto: CreateRoomDto,
  ) {
    const room = await this.roomsService.create(hostId, propertyId, dto);
    return { success: true, data: room };
  }

  /**
   * Get all rooms for a property.
   */
  @Get()
  async findAll(
    @CurrentUser('sub') hostId: string,
    @Param('propertyId') propertyId: string,
  ) {
    const rooms = await this.roomsService.findAll(hostId, propertyId);
    return { success: true, data: rooms };
  }

  /**
   * Get a single room.
   */
  @Get(':roomId')
  async findOne(
    @CurrentUser('sub') hostId: string,
    @Param('propertyId') propertyId: string,
    @Param('roomId') roomId: string,
  ) {
    const room = await this.roomsService.findOne(hostId, propertyId, roomId);
    return { success: true, data: room };
  }

  /**
   * Update a room.
   */
  @Put(':roomId')
  async update(
    @CurrentUser('sub') hostId: string,
    @Param('propertyId') propertyId: string,
    @Param('roomId') roomId: string,
    @Body() dto: UpdateRoomDto,
  ) {
    const room = await this.roomsService.update(
      hostId,
      propertyId,
      roomId,
      dto,
    );
    return { success: true, data: room };
  }

  /**
   * Delete (deactivate) a room.
   */
  @Delete(':roomId')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser('sub') hostId: string,
    @Param('propertyId') propertyId: string,
    @Param('roomId') roomId: string,
  ) {
    const result = await this.roomsService.remove(hostId, propertyId, roomId);
    return { success: true, ...result };
  }

  /**
   * Check room availability for a date range.
   */
  @Get(':roomId/availability')
  async checkAvailability(
    @CurrentUser('sub') hostId: string,
    @Param('propertyId') propertyId: string,
    @Param('roomId') roomId: string,
    @Query('checkIn') checkIn: string,
    @Query('checkOut') checkOut: string,
  ) {
    // Verify host owns the room
    await this.roomsService.findOne(hostId, propertyId, roomId);

    const isAvailable = await this.roomsService.checkAvailability(
      roomId,
      new Date(checkIn),
      new Date(checkOut),
    );

    return {
      success: true,
      data: {
        roomId,
        checkIn,
        checkOut,
        isAvailable,
      },
    };
  }

  /**
   * Get all bookings for a room.
   */
  @Get(':roomId/bookings')
  async getBookings(
    @CurrentUser('sub') hostId: string,
    @Param('propertyId') propertyId: string,
    @Param('roomId') roomId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const bookings = await this.roomsService.getBookings(
      hostId,
      propertyId,
      roomId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );

    return { success: true, data: bookings };
  }
}
