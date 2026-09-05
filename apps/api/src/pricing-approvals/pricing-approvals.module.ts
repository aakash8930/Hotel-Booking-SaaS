import { Module } from '@nestjs/common';
import { PricingApprovalsController } from './pricing-approvals.controller';
import { PricingApprovalsService } from './pricing-approvals.service';
@Module({controllers:[PricingApprovalsController],providers:[PricingApprovalsService]})
export class PricingApprovalsModule {}
