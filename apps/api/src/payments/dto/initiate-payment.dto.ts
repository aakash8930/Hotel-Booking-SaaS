import { IsString, IsOptional, IsIn } from 'class-validator';

export class InitiatePaymentDto {
  @IsString()
  bookingId: string;

  @IsOptional()
  @IsIn(['UPI', 'CARD', 'NETBANKING', 'WALLET'])
  method?: 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET';
}
