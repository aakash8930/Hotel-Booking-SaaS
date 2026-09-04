import { IsEnum } from 'class-validator';
import { BillingPlan } from '@hbs/prisma';

export class UpdateBillingPlanDto {
  @IsEnum(BillingPlan)
  billingPlan: BillingPlan;
}
