import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma, Prisma } from '@hbs/prisma';

@Injectable()
export class PricingCalendarService {
  async getCalendar(hostId: string, propertyId: string, from?: string, days = 30) {
    const property = await prisma.property.findFirst({ where: { id: propertyId, hostId }, include: { rooms: { select: { id: true, name: true, basePrice: true } } } });
    if (!property) throw new NotFoundException('Property not found');
    const start = from ? new Date(from + 'T00:00:00.000Z') : new Date();
    start.setUTCHours(0,0,0,0);
    const end = new Date(start); end.setUTCDate(end.getUTCDate() + Math.min(Math.max(days, 1), 90));
    const [rules, bookings] = await Promise.all([
      prisma.pricingRule.findMany({ where: { propertyId, isActive: true }, orderBy: { createdAt: 'asc' } }),
      prisma.booking.findMany({
        where: { room: { propertyId }, checkIn: { lt: end }, checkOut: { gt: start }, status: { not: 'EXPIRED' } },
        select: { roomId: true, checkIn: true, checkOut: true, status: true, createdAt: true, totalPrice: true },
      }),
    ]);

    const activeStatuses = new Set(['CONFIRMED','PAID','CHECKED_IN']);
    const calendar = [];
    for (let i=0; i<Math.min(Math.max(days,1),90); i++) {
      const date = new Date(start); date.setUTCDate(date.getUTCDate()+i);
      const next = new Date(date); next.setUTCDate(next.getUTCDate()+1);
      const occupied = bookings.filter(b => new Date(b.checkIn) < next && new Date(b.checkOut) > date && activeStatuses.has(b.status)).length;
      const demand = property.rooms.length ? Math.round((occupied / property.rooms.length) * 100) : 0;
      const applicable = rules.filter(r => (!r.startDate || r.startDate <= date) && (!r.endDate || r.endDate >= date) &&
        (r.minDemand == null || demand >= r.minDemand) && (r.maxDemand == null || demand <= r.maxDemand));
      const roomPrices = property.rooms.map(room => {
        let price = Number(room.basePrice);
        for (const rule of applicable) price = rule.adjustmentType === 'PERCENT'
          ? price * (1 + Number(rule.adjustment)/100) : price + Number(rule.adjustment);
        return { roomId: room.id, roomName: room.name, basePrice: Number(room.basePrice), suggestedPrice: Math.max(0, Math.round(price*100)/100) };
      });
      calendar.push({ date: date.toISOString().slice(0,10), occupied, totalRooms: property.rooms.length, demand, applicableRules: applicable.map(r=>({id:r.id,name:r.name})), roomPrices });
    }
    return { property: { id: property.id, name: property.name, currency: property.rooms[0]?.currency ?? 'INR' }, from: start.toISOString(), to: end.toISOString(), days: calendar };
  }

  async applyRulePreview(hostId: string, propertyId: string, ruleId: string) {
    const rule = await prisma.pricingRule.findFirst({ where: { id: ruleId, propertyId, property: { hostId } } });
    if (!rule) throw new NotFoundException('Pricing rule not found');
    return { id: rule.id, name: rule.name, adjustment: Number(rule.adjustment), adjustmentType: rule.adjustmentType, note: 'Preview only. Booking prices are unchanged until an explicit approval workflow is implemented.' };
  }
}
