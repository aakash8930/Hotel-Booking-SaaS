import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePropertyDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsString()
  @MinLength(5)
  @MaxLength(500)
  address: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  state: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'Pincode must be a 6-digit number' })
  pincode: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsEnum(['DRAFT', 'ACTIVE', 'SUSPENDED'])
  status?: 'DRAFT' | 'ACTIVE' | 'SUSPENDED';

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Check-in time must be in HH:MM format',
  })
  checkInTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Check-out time must be in HH:MM format',
  })
  checkOutTime?: string;

  @IsOptional()
  rules?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(['FLEXIBLE', 'MODERATE', 'STRICT'])
  cancellationPolicy?: 'FLEXIBLE' | 'MODERATE' | 'STRICT';
}
