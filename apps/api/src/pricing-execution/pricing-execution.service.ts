import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma, Prisma } from '@hbs/prisma';

@Injectable()
export class PricingExecutionService {
  private day(s:string){const d=new Date(s+'T00:00:00.000Z');if(Number.isNaN(d.getTime()))throw new BadRequestException('Invalid effectiveDate');return d}
  async approveAndApply(hostId:string,id:string){
    const approval=await prisma.pricingApproval.findFirst({where:{id,hostId}});
    if(!approval)throw new NotFoundException('Pricing approval not found');
    if(approval.status!=='PENDING')throw new BadRequestException('Pricing decision has already been finalized');
    if(!approval.roomId)throw new BadRequestException('A room is required before live pricing can be applied');
    return prisma.$transaction(async tx=>{
      const room=await tx.room.findFirst({where:{id:approval.roomId!,propertyId:approval.propertyId}});
      if(!room)throw new NotFoundException('Room not found');
      const current=await tx.dailyRoomPrice.findUnique({where:{roomId_effectiveDate:{roomId:room.id,effectiveDate:approval.effectiveDate}}});
      const previous=current?.price ?? room.basePrice;
      const proposed=approval.proposedPrice;
      if(proposed.lt(0))throw new BadRequestException('Price cannot be negative');
      const version=(current?.version??0)+1;
      const price=await tx.dailyRoomPrice.upsert({
        where:{roomId_effectiveDate:{roomId:room.id,effectiveDate:approval.effectiveDate}},
        create:{roomId:room.id,propertyId:approval.propertyId,effectiveDate:approval.effectiveDate,price:proposed,previousPrice:previous,source:'APPROVED_RULE',approvalId:approval.id,version},
        update:{price:proposed,previousPrice:previous,source:'APPROVED_RULE',approvalId:approval.id,version},
      });
      const decided=await tx.pricingApproval.update({where:{id:approval.id},data:{status:'APPROVED',decidedAt:new Date()}});
      return {approval:decided,price,previousPrice:previous,proposedPrice:proposed};
    });
  }
  async rollback(hostId:string,id:string){
    const current=await prisma.dailyRoomPrice.findFirst({where:{id,property:{hostId}}});
    if(!current)throw new NotFoundException('Price version not found');
    if(current.previousPrice===null)return {rolledBack:false,reason:'No previous price recorded'};
    const price=await prisma.dailyRoomPrice.update({where:{id},data:{price:current.previousPrice,previousPrice:current.price,source:'MANUAL',version:{increment:1}}});
    return {rolledBack:true,price};
  }
  async list(hostId:string,propertyId:string,from?:string,days=30){
    const p=await prisma.property.findFirst({where:{id:propertyId,hostId},select:{id:true}});
    if(!p)throw new NotFoundException('Property not found');
    const start=from?this.day(from):new Date(); start.setUTCHours(0,0,0,0);
    const end=new Date(start);end.setUTCDate(end.getUTCDate()+Math.min(Math.max(days,1),90));
    return prisma.dailyRoomPrice.findMany({where:{propertyId,effectiveDate:{gte:start,lt:end}},orderBy:[{effectiveDate:'asc'},{roomId:'asc'}]});
  }
  async quote(roomId:string,checkIn:string,checkOut:string){
    const from=this.day(checkIn),to=this.day(checkOut),prices=await prisma.dailyRoomPrice.findMany({where:{roomId,effectiveDate:{gte:from,lt:to}},select:{effectiveDate:true,price:true}});
    const room=await prisma.room.findUnique({where:{id:roomId},select:{basePrice:true}});
    if(!room)throw new NotFoundException('Room not found');
    const byDate=new Map(prices.map(p=>[p.effectiveDate.toISOString().slice(0,10),Number(p.price)]));
    let total=0;for(let d=new Date(from);d<to;d.setUTCDate(d.getUTCDate()+1)){total+=byDate.get(d.toISOString().slice(0,10))??Number(room.basePrice)}
    return {roomId,checkIn,checkOut,total,nightlyRates:Array.from(byDate.entries())};
  }
}
