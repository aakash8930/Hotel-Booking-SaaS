import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RevenueRecommendationsService } from './revenue-recommendations.service';
@Controller('host/revenue-recommendations')
@UseGuards(JwtAuthGuard)
export class RevenueRecommendationsController {
 constructor(private readonly service: RevenueRecommendationsService){}
 @Get(':propertyId') get(@CurrentUser('sub') hostId:string,@Param('propertyId') propertyId:string,@Query('days') days?:string){return this.service.get(hostId,propertyId,days?Number(days):30);}
}
