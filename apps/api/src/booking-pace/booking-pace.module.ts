import { Module } from '@nestjs/common';
import { BookingPaceController } from './booking-pace.controller';
import { BookingPaceService } from './booking-pace.service';
@Module({ controllers: [BookingPaceController], providers: [BookingPaceService] })
export class BookingPaceModule {}
