import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PayoutsModule } from '../payouts/payouts.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PayoutsModule, PaymentsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
