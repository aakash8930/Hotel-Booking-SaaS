import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@hbs/prisma';

@Injectable()
export class BookingPaceService {
  async getPace(hostId: string, propertyId: string, days = 30) {
    const property = await prisma.property.findFirst({ where: { id: propertyId, hostId }, include: { rooms: { select: { id: true } } } });
    if (!property) throw new NotFoundException('Property not found');
    const horizon = Math.min(Math.max(days, 7), 90);
    const now = new Date(); now.setUTCHours(0,0,0,0);
    const from = new Date(now); from.setUTCDate(from.getUTCDate() - 30);
    const to = new Date(now); to.setUTCDate(to.getUTCDate() + horizon);
    const bookings = await prisma.booking.findMany({
      where: { room: { propertyId }, createdAt: { gte: from }, checkIn: { lt: to }, checkOut: { gt: now }, status: { not: 'EXPIRED' } },
      select: { checkIn: true, checkOut: true, createdAt: true, status: true },
    });
    const active = new Set(['CONFIRMED','PAID','CHECKED_IN']);
    const dates = Array.from({ length: horizon }, (_, i) => {
      const date = new Date(now); date.setUTCDate(date.getUTCDate()+i);
      const next = new Date(date); next.setUTCDate(next.getUTCDate()+1);
      const futureBookings = bookings.filter(b => new Date(b.checkIn) < next && new Date(b.checkOut) > date && active.has(b.status));
      const recentPickup = bookings.filter(b => new Date(b.createdAt) >= new Date(now.getTime()-7*86_400_000) && new Date(b.checkIn) < next && new Date(b.checkOut) > date && active.has(b.status)).length;
      const priorPickup = bookings.filter(b => {
        const created = new Date(b.createdAt);
        return created >= new Date(now.getTime()-14*86_400_000) && created < new Date(now.getTime()-7*86_400_000) && new Date(b.checkIn) < next && new Date(b.checkOut) > date && active.has(b.status);
      }).length;
      const pace = recentPickup - priorPickup;
      return { date: date.toISOString().slice(0,10), bookedRooms: futureBookings.length, capacity: property.rooms.length, occupancy: property.rooms.length ? Math.round(futureBookings.length/property.rooms.length*100) : 0, pickup7d: recentPickup, previous7dPickup: priorPickup, paceDelta: pace, pace: pace > 0 ? 'ACCELERATING' : pace < 0 ? 'SLOWING' : 'STABLE' };
    });
    return { property: { id: property.id, name: property.name }, window: { from: now.toISOString(), to: to.toISOString() }, summary: {
      acceleratingDays: dates.filter(d=>d.pace==='ACCELERATING').length,
      slowingDays: dates.filter(d=>d.pace==='SLOWING').length,
      stableDays: dates.filter(d=>d.pace==='STABLE').length,
    }, dates };
  }
}
