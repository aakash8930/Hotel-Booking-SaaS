import { IsString, IsInt, Min, Max, IsOptional, MaxLength } from 'class-validator';

export class CreateReviewDto {
  @IsString()
  bookingId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
