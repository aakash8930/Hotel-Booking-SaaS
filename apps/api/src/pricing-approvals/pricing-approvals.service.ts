import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma, Prisma } from '@hbs/prisma';

@Injectable()
export class PricingApprovalsService {
  async create(hostId:string, propertyId:string, body:any){
    const property=await prisma.property.findFirst({where:{id:propertyId,hostId},include:{rooms:{select:{id:true,basePrice:true}}}});
    if(!property) throw new NotFoundException('Property not found');
    if(!body.effectiveDate || !body.proposedPrice || !body.previousPrice) throw new Error('Pricing decision is incomplete');
    return prisma.pricingApproval.create({data:{
      propertyId,hostId,ruleId:body.ruleId||undefined,roomId:body.roomId||undefined,
      effectiveDate:new Date(body.effectiveDate),previousPrice:new Prisma.Decimal(body.previousPrice),
      proposedPrice:new Prisma.Decimal(body.proposedPrice),action:body.action||'HOLD',
      reason:body.reason||'Revenue recommendation review',status:'PENDING'
    }});
  }
  async list(hostId:string,propertyId:string){
    const property=await prisma.property.findFirst({where:{id:propertyId,hostId},select:{id:true}});
    if(!property) throw new NotFoundException('Property not found');
    return prisma.pricingApproval.findMany({where:{propertyId},orderBy:{createdAt:'desc'},take:100});
  }
  async decide(hostId:string,id:string,status:'APPROVED'|'REJECTED'){
    const item=await prisma.pricingApproval.findFirst({where:{id,hostId}});
    if(!item) throw new NotFoundException('Pricing approval not found');
    if(item.status!=='PENDING') throw new Error('Pricing decision has already been finalized');
    return prisma.pricingApproval.update({where:{id},data:{status,decidedAt:new Date()}});
  }
}
