import { Module } from '@nestjs/common';
import { PricingCalendarController } from './pricing-calendar.controller';
import { PricingCalendarService } from './pricing-calendar.service';
@Module({ controllers: [PricingCalendarController], providers: [PricingCalendarService] })
export class PricingCalendarModule {}
