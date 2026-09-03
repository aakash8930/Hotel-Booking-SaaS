import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PhonePeService } from './phonepe.service';
import { EmailService } from './email.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, PhonePeService, EmailService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
