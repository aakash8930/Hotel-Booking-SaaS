import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PricingRulesService } from './pricing-rules.service';

@Controller('host/pricing-rules')
@UseGuards(JwtAuthGuard)
export class PricingRulesController {
  constructor(private readonly service: PricingRulesService) {}
  @Get(':propertyId') list(@CurrentUser('sub') hostId: string, @Param('propertyId') propertyId: string) {
    return this.service.list(hostId, propertyId);
  }
  @Post(':propertyId') create(@CurrentUser('sub') hostId: string, @Param('propertyId') propertyId: string, @Body() body: any) {
    return this.service.create(hostId, propertyId, body);
  }
  @Patch(':id/active') setActive(@CurrentUser('sub') hostId: string, @Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.service.setActive(hostId, id, isActive);
  }
}
