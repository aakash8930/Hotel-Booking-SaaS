import { IsString, IsIn, MinLength, MaxLength } from 'class-validator';

export class SubmitVerificationDto {
  @IsIn(['AADHAAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE'])
  idType: 'AADHAAR' | 'PAN' | 'PASSPORT' | 'DRIVING_LICENSE';

  @IsString()
  @MinLength(4)
  @MaxLength(50)
  idNumber: string;
}
