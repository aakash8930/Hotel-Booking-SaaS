import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GuestAuthGuard } from '../auth/guards/guest-auth.guard';
import { OptionalGuestAuthGuard } from '../auth/guards/optional-guest-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { BookingStatus } from '@hbs/prisma';

@Controller()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // ── Guest-facing endpoints ───────────────────────────────────────────

  /**
   * Create a new booking (soft-hold).
   * No auth required — guest provides their details in the DTO. If the
   * caller is a logged-in guest, the booking attaches to their account
   * instead of doing find-or-create-by-email.
   */
  @Post('bookings')
  @UseGuards(OptionalGuestAuthGuard)
  async create(
    @Body() dto: CreateBookingDto,
    @CurrentUser('sub') guestId: string | undefined,
  ) {
    const booking = await this.bookingsService.create(dto, guestId);
    return { success: true, data: booking };
  }

  /**
   * Get the logged-in guest's own booking history ("My trips").
   */
  @Get('guest/bookings')
  @UseGuards(GuestAuthGuard)
  async findAllForGuest(@CurrentUser('sub') guestId: string) {
    const bookings = await this.bookingsService.findAllForGuest(guestId);
    return { success: true, data: bookings };
  }

  /**
   * Get booking details (public — uses booking ID as a token).
   * In production, you'd want to scope this to the guest who made it.
   */
  @Get('bookings/:id')
  async findOne(@Param('id') id: string) {
    const booking = await this.bookingsService.findOne(id);
    return { success: true, data: booking };
  }

  /**
   * Confirm a booking (simulates payment completion).
   */
  @Post('bookings/:id/confirm')
  @HttpCode(HttpStatus.OK)
  async confirm(@Param('id') id: string) {
    const booking = await this.bookingsService.confirm(id);
    return { success: true, data: booking };
  }

  /**
   * Preview the refund a cancellation would produce right now.
   */
  @Get('bookings/:id/cancellation-preview')
  async previewCancellation(@Param('id') id: string) {
    const refund = await this.bookingsService.previewCancellation(id);
    return { success: true, data: refund };
  }

  /**
   * Cancel a booking.
   */
  @Post('bookings/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    const booking = await this.bookingsService.cancel(id, reason);
    return { success: true, data: booking };
  }

  // ── Host-facing endpoints ────────────────────────────────────────────

  /**
   * Get all bookings for the authenticated host's properties.
   * Optional ?status= and ?propertyId= filters.
   */
  @Get('host/bookings')
  @UseGuards(JwtAuthGuard)
  async findAllForHost(
    @CurrentUser('sub') hostId: string,
    @Query('status') status?: BookingStatus,
    @Query('propertyId') propertyId?: string,
  ) {
    const bookings = await this.bookingsService.findAllForHost(hostId, { status, propertyId });
    return { success: true, data: bookings };
  }

  /**
   * Summary stats for the host dashboard.
   */
  @Get('host/analytics')
  @UseGuards(JwtAuthGuard)
  async getAnalytics(@CurrentUser('sub') hostId: string) {
    const analytics = await this.bookingsService.getAnalytics(hostId);
    return { success: true, data: analytics };
  }

  /**
   * Get bookings for a specific property.
   */
  @Get('host/properties/:propertyId/bookings')
  @UseGuards(JwtAuthGuard)
  async findAllForProperty(
    @CurrentUser('sub') hostId: string,
    @Param('propertyId') propertyId: string,
  ) {
    const bookings = await this.bookingsService.findAllForProperty(
      hostId,
      propertyId,
    );
    return { success: true, data: bookings };
  }

  /**
   * Manually trigger expired hold cleanup.
   * In production, this runs as a scheduled job (cron).
   */
  @Post('host/bookings/cleanup-expired')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async cleanupExpired() {
    const count = await this.bookingsService.cleanupExpiredHolds();
    return {
      success: true,
      data: { expiredCount: count },
    };
  }
}
