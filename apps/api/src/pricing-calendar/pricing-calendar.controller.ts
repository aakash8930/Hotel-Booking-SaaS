import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PricingCalendarService } from './pricing-calendar.service';

@Controller('host/pricing-calendar')
@UseGuards(JwtAuthGuard)
export class PricingCalendarController {
  constructor(private readonly service: PricingCalendarService) {}
  @Get(':propertyId')
  get(@CurrentUser('sub') hostId: string, @Param('propertyId') propertyId: string, @Query('from') from?: string, @Query('days') days?: string) {
    return this.service.getCalendar(hostId, propertyId, from, days ? Number(days) : 30);
  }
}
