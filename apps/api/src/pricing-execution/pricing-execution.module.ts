import { Module } from '@nestjs/common';
import { PricingExecutionController } from './pricing-execution.controller';
import { PricingExecutionService } from './pricing-execution.service';
@Module({controllers:[PricingExecutionController],providers:[PricingExecutionService]})
export class PricingExecutionModule {}
