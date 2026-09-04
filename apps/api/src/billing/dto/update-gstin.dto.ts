import { IsOptional, IsString, Matches } from 'class-validator';

export class UpdateGstinDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/, {
    message: 'GSTIN must be a valid 15-character GST identification number',
  })
  gstin?: string;
}
