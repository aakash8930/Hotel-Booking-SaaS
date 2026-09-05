import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RevenueInsightsService } from './revenue-insights.service';

@Controller('host/revenue')
@UseGuards(JwtAuthGuard)
export class RevenueInsightsController {
  constructor(private readonly insights: RevenueInsightsService) {}
  @Get(':propertyId')
  async getInsights(@CurrentUser('sub') hostId: string, @Param('propertyId') propertyId: string) {
    return { success: true, data: await this.insights.getPropertyInsights(hostId, propertyId) };
  }
}
