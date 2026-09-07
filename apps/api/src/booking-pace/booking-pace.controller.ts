import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BookingPaceService } from './booking-pace.service';
@Controller('host/booking-pace')
@UseGuards(JwtAuthGuard)
export class BookingPaceController {
  constructor(private readonly service: BookingPaceService) {}
  @Get(':propertyId') get(@CurrentUser('sub') hostId: string, @Param('propertyId') propertyId: string, @Query('days') days?: string) {
    return this.service.getPace(hostId, propertyId, days ? Number(days) : 30);
  }
}
