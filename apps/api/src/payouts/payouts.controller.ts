import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller()
export class PayoutsController {
  constructor(private readonly payouts: PayoutsService) {}

  @Get('host/payouts/balance')
  @UseGuards(JwtAuthGuard)
  async getBalance(@CurrentUser('sub') hostId: string) {
    const balance = await this.payouts.getBalance(hostId);
    return { success: true, data: balance };
  }

  @Post('host/payouts')
  @UseGuards(JwtAuthGuard)
  async generate(@CurrentUser('sub') hostId: string) {
    const payout = await this.payouts.generate(hostId);
    return { success: true, data: payout };
  }

  @Get('host/payouts')
  @UseGuards(JwtAuthGuard)
  async listForHost(@CurrentUser('sub') hostId: string) {
    const payouts = await this.payouts.listForHost(hostId);
    return { success: true, data: payouts };
  }
}
