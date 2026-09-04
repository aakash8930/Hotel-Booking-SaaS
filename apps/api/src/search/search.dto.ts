import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsArray,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export const SEARCH_SORT_OPTIONS = ['price_asc', 'price_desc', 'rating_desc', 'newest'] as const;
export type SearchSort = (typeof SEARCH_SORT_OPTIONS)[number];

export class SearchDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsDateString({}, { message: 'Check-in must be a valid date (YYYY-MM-DD)' })
  checkIn: string;

  @IsDateString({}, { message: 'Check-out must be a valid date (YYYY-MM-DD)' })
  checkOut: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  guests?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  offset?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? value.split(',').map((a) => a.trim()).filter(Boolean)
        : value,
  )
  amenities?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  minRating?: number;

  @IsOptional()
  @IsIn(SEARCH_SORT_OPTIONS)
  sortBy?: SearchSort;
}
