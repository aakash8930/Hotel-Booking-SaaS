import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@hbs/prisma';

@Injectable()
export class RevenueRecommendationsService {
  async get(hostId: string, propertyId: string, days = 30) {
    const property = await prisma.property.findFirst({ where: { id: propertyId, hostId }, include: { rooms: { select: { id: true, name: true, basePrice: true } } } });
    if (!property) throw new NotFoundException('Property not found');
    const horizon=Math.min(Math.max(days,7),90), now=new Date(); now.setUTCHours(0,0,0,0);
    const to=new Date(now); to.setUTCDate(to.getUTCDate()+horizon);
    const bookings=await prisma.booking.findMany({where:{room:{propertyId},checkIn:{lt:to},checkOut:{gt:now},status:{in:['CONFIRMED','PAID','CHECKED_IN']}},select:{checkIn:true,checkOut:true,createdAt:true}});
    const activeDays=[]; const recentFrom=new Date(now); recentFrom.setUTCDate(recentFrom.getUTCDate()-7);
    const priorFrom=new Date(now); priorFrom.setUTCDate(priorFrom.getUTCDate()-14);
    for(let i=0;i<horizon;i++){
      const d=new Date(now); d.setUTCDate(d.getUTCDate()+i); const n=new Date(d); n.setUTCDate(n.getUTCDate()+1);
      const booked=bookings.filter(b=>new Date(b.checkIn)<n&&new Date(b.checkOut)>d).length;
      const pickup=bookings.filter(b=>new Date(b.createdAt)>=recentFrom&&new Date(b.checkIn)<n&&new Date(b.checkOut)>d).length;
      const prior=bookings.filter(b=>new Date(b.createdAt)>=priorFrom&&new Date(b.createdAt)<recentFrom&&new Date(b.checkIn)<n&&new Date(b.checkOut)>d).length;
      const occupancy=property.rooms.length?Math.round(booked/property.rooms.length*100):0;
      const pace=pickup-prior;
      let action:'INCREASE'|'HOLD'|'DECREASE'='HOLD'; let confidence='LOW'; let adjustment=0; let reason='Demand is currently balanced; keep the base rate under review.';
      if(occupancy>=80&&pace>0){action='INCREASE';adjustment=10;confidence='HIGH';reason='High forward occupancy and accelerating pickup indicate stronger demand.';}
      else if(occupancy>=65&&pace>0){action='INCREASE';adjustment=5;confidence='MEDIUM';reason='Occupancy is healthy and booking pace is accelerating.';}
      else if(occupancy<=30&&pace<=0){action='DECREASE';adjustment=-10;confidence='HIGH';reason='Low forward occupancy and slowing pickup indicate softer demand.';}
      else if(occupancy<=45&&pace<0){action='DECREASE';adjustment=-5;confidence='MEDIUM';reason='Lower occupancy combined with slowing pickup suggests softer demand.';}
      activeDays.push({date:d.toISOString().slice(0,10),occupancy,pickup7d:pickup,previous7dPickup:prior,paceDelta:pace,action,adjustmentPercent:adjustment,confidence,reason});
    }
    return {property:{id:property.id,name:property.name},days:activeDays,summary:{increase:activeDays.filter(x=>x.action==='INCREASE').length,decrease:activeDays.filter(x=>x.action==='DECREASE').length,hold:activeDays.filter(x=>x.action==='HOLD').length}};
  }
}
