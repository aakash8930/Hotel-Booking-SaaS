import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PricingApprovalsService } from './pricing-approvals.service';
@Controller('host/pricing-approvals')
@UseGuards(JwtAuthGuard)
export class PricingApprovalsController {
 constructor(private readonly service:PricingApprovalsService){}
 @Post(':propertyId') create(@CurrentUser('sub') hostId:string,@Param('propertyId') propertyId:string,@Body() body:any){return this.service.create(hostId,propertyId,body);}
 @Get(':propertyId') list(@CurrentUser('sub') hostId:string,@Param('propertyId') propertyId:string){return this.service.list(hostId,propertyId);}
 @Patch(':id/decision') decide(@CurrentUser('sub') hostId:string,@Param('id') id:string,@Body('status') status:'APPROVED'|'REJECTED'){return this.service.decide(hostId,id,status);}
}
