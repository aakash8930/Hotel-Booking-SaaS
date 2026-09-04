import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PhonePeService } from './phonepe.service';
import { EmailService } from './email.service';
import { WhatsAppService } from './whatsapp.service';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [InvoicesModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PhonePeService, EmailService, WhatsAppService],
  exports: [PaymentsService, WhatsAppService],
})
export class PaymentsModule {}
