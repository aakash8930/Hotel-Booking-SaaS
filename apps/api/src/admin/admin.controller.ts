import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import type { BookingStatus, VerificationStatus, PropertyStatus } from '@hbs/prisma';

@Controller('admin')
@UseGuards(AdminAuthGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('stats')
  async getStats() {
    return { success: true, data: await this.admin.getStats() };
  }

  // ── Hosts ───────────────────────────────────────────────────────────────

  @Get('hosts')
  async listHosts(@Query('verificationStatus') verificationStatus?: VerificationStatus) {
    return { success: true, data: await this.admin.listHosts(verificationStatus) };
  }

  @Put('hosts/:id/active')
  async setHostActive(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return { success: true, data: await this.admin.setHostActive(id, isActive) };
  }

  @Put('hosts/:id/verification')
  async reviewVerification(
    @Param('id') id: string,
    @Body('decision') decision: 'VERIFIED' | 'REJECTED',
    @Body('note') note?: string,
  ) {
    return { success: true, data: await this.admin.reviewHostVerification(id, decision, note) };
  }

  // ── Properties ──────────────────────────────────────────────────────────

  @Get('properties')
  async listProperties(@Query('status') status?: PropertyStatus) {
    return { success: true, data: await this.admin.listProperties(status) };
  }

  @Put('properties/:id/status')
  async setPropertyStatus(@Param('id') id: string, @Body('status') status: PropertyStatus) {
    return { success: true, data: await this.admin.setPropertyStatus(id, status) };
  }

  // ── Reviews ─────────────────────────────────────────────────────────────

  @Get('reviews')
  async listReviews(@Query('filter') filter?: 'reported' | 'hidden') {
    return { success: true, data: await this.admin.listReviews(filter) };
  }

  @Put('reviews/:id/hidden')
  async setReviewHidden(
    @Param('id') id: string,
    @Body('hidden') hidden: boolean,
    @Body('reason') reason?: string,
  ) {
    return { success: true, data: await this.admin.setReviewHidden(id, hidden, reason) };
  }

  // ── Bookings ────────────────────────────────────────────────────────────

  @Get('bookings')
  async searchBookings(@Query('q') query?: string) {
    return { success: true, data: await this.admin.searchBookings(query) };
  }

  @Post('bookings/:id/transition')
  @HttpCode(HttpStatus.OK)
  async transitionBooking(
    @Param('id') id: string,
    @Body('targetStatus') targetStatus: BookingStatus,
    @Body('reason') reason?: string,
  ) {
    return { success: true, data: await this.admin.transitionBooking(id, targetStatus, reason) };
  }

  // ── Payouts ─────────────────────────────────────────────────────────────

  @Get('payouts')
  async listPayouts() {
    return { success: true, data: await this.admin.listPayouts() };
  }

  @Post('payouts/:id/mark-paid')
  @HttpCode(HttpStatus.OK)
  async markPayoutPaid(@Param('id') id: string, @Body('payoutReference') payoutReference?: string) {
    return { success: true, data: await this.admin.markPayoutPaid(id, payoutReference) };
  }
}
