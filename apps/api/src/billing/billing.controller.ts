import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { BillingService } from './billing.service';
import { UpdateBillingPlanDto } from './dto/update-billing-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('host/billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  async getPlan(@CurrentUser('sub') hostId: string) {
    const plan = await this.billing.getPlan(hostId);
    return { success: true, data: plan };
  }

  @Put()
  async setPlan(
    @CurrentUser('sub') hostId: string,
    @Body() dto: UpdateBillingPlanDto,
  ) {
    const plan = await this.billing.setPlan(hostId, dto.billingPlan);
    return { success: true, data: plan };
  }
}
