import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PhonePeService } from './phonepe.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, PhonePeService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
