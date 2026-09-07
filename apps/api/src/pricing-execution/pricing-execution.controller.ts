import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PricingExecutionService } from './pricing-execution.service';
@Controller('host/pricing-execution')
@UseGuards(JwtAuthGuard)
export class PricingExecutionController {
 constructor(private readonly service:PricingExecutionService){}
 @Post('approval/:id/apply') apply(@CurrentUser('sub') hostId:string,@Param('id') id:string){return this.service.approveAndApply(hostId,id)}
 @Post('version/:id/rollback') rollback(@CurrentUser('sub') hostId:string,@Param('id') id:string){return this.service.rollback(hostId,id)}
 @Get(':propertyId') list(@CurrentUser('sub') hostId:string,@Param('propertyId') propertyId:string,@Query('from') from?:string,@Query('days') days?:string){return this.service.list(hostId,propertyId,from,days?Number(days):30)}
}
