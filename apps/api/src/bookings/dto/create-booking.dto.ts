import {
  IsString,
  IsEmail,
  IsNumber,
  IsOptional,
  IsDateString,
  Min,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBookingDto {
  @IsString()
  roomId: string;

  @IsDateString({}, { message: 'Check-in must be a valid date (YYYY-MM-DD)' })
  checkIn: string;

  @IsDateString({}, { message: 'Check-out must be a valid date (YYYY-MM-DD)' })
  checkOut: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  guests: number;

  // ── Guest details (find-or-create) ─────────────────────────────────
  @IsEmail({}, { message: 'Please provide a valid email address' })
  guestEmail: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  guestName: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{9,14}$/, {
    message: 'Phone must be a valid international format',
  })
  guestPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  specialRequests?: string;
}
