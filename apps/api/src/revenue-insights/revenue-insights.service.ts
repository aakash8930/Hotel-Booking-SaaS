import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma, BookingStatus } from '@hbs/prisma';

@Injectable()
export class RevenueInsightsService {
  async getPropertyInsights(hostId: string, propertyId: string) {
    const property = await prisma.property.findFirst({
      where: { id: propertyId, hostId },
      include: { rooms: { select: { id: true, name: true, basePrice: true } } },
    });
    if (!property) throw new NotFoundException('Property not found');

    const now = new Date();
    const start = new Date(now); start.setDate(start.getDate() - 30);
    const end = new Date(now); end.setDate(end.getDate() + 30);

    const bookings = await prisma.booking.findMany({
      where: { room: { propertyId }, createdAt: { gte: start }, status: { not: BookingStatus.EXPIRED } },
      select: { roomId: true, checkIn: true, checkOut: true, totalPrice: true, status: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const activeRevenueStatuses = [BookingStatus.PAID, BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT];
    const revenue = bookings.filter(b => activeRevenueStatuses.includes(b.status))
      .reduce((sum, b) => sum + Number(b.totalPrice), 0);
    const confirmed = bookings.filter(b =>
      [BookingStatus.CONFIRMED, ...activeRevenueStatuses].includes(b.status),
    ).length;
    const cancelled = bookings.filter(b => b.status === BookingStatus.CANCELLED).length;

    const roomStats = property.rooms.map(room => {
      const roomBookings = bookings.filter(b => b.roomId === room.id);
      const roomRevenue = roomBookings.filter(b => activeRevenueStatuses.includes(b.status))
        .reduce((sum, b) => sum + Number(b.totalPrice), 0);
      const bookedNights = roomBookings.reduce((sum, b) => {
        const nights = Math.round((new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / 86_400_000);
        return sum + Math.max(0, nights);
      }, 0);
      return { roomId: room.id, roomName: room.name, basePrice: Number(room.basePrice),
        bookings: roomBookings.length, bookedNights, revenue: Math.round(roomRevenue * 100) / 100 };
    });

    const demandForecast = Array.from({ length: 14 }, (_, index) => {
      const day = new Date(now); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() + index);
      const next = new Date(day); next.setDate(next.getDate() + 1);
      const bookedRooms = bookings.filter(b =>
        new Date(b.checkIn) < next && new Date(b.checkOut) > day &&
        [BookingStatus.CONFIRMED, ...activeRevenueStatuses].includes(b.status),
      ).length;
      return {
        date: day.toISOString().slice(0, 10),
        bookedRooms,
        availableRooms: Math.max(0, property.rooms.length - bookedRooms),
        demandRatio: property.rooms.length ? Math.round((bookedRooms / property.rooms.length) * 100) : 0,
      };
    });

    const peakDays = demandForecast.filter(d => d.demandRatio >= 80);
    const lowDemandDays = demandForecast.filter(d => d.demandRatio <= 30);
    const recommendations = [
      ...(peakDays.length ? [{ type: 'PRICE_UP', priority: 'high', title: 'Raise rates on high-demand dates',
        message: peakDays.length + ' upcoming day(s) are at 80%+ booked capacity. Consider a 10–15% rate increase.' }] : []),
      ...(lowDemandDays.length ? [{ type: 'PROMOTION', priority: 'medium', title: 'Stimulate low-demand dates',
        message: lowDemandDays.length + ' upcoming day(s) are below 30% booked capacity. Consider a targeted offer instead of a blanket discount.' }] : []),
      ...(cancelled > confirmed * 0.2 && cancelled >= 3 ? [{ type: 'CANCELLATION', priority: 'high',
        title: 'Investigate cancellation rate',
        message: cancelled + ' cancellations were recorded in the last 30 days. Review cancellation reasons and policy friction.' }] : []),
      ...(!bookings.length ? [{ type: 'SETUP', priority: 'medium', title: 'Collect more booking data',
        message: 'Revenue recommendations become more reliable after the property has a meaningful booking history.' }] : []),
    ];

    return {
      property: { id: property.id, name: property.name, currency: 'INR' },
      window: { from: start.toISOString(), to: end.toISOString() },
      summary: {
        revenue30d: Math.round(revenue * 100) / 100,
        bookings30d: bookings.length,
        confirmedBookings30d: confirmed,
        cancellations30d: cancelled,
        averageBookingValue: bookings.length ? Math.round((revenue / Math.max(1, bookings.length)) * 100) / 100 : 0,
      },
      metrics: {
        occupancyRate30d: property.rooms.length
          ? Math.round((bookings.reduce((sum, b) => {
              const from = Math.max(new Date(b.checkIn).getTime(), start.getTime());
              const to = Math.min(new Date(b.checkOut).getTime(), now.getTime());
              return sum + Math.max(0, Math.round((to - from) / 86_400_000));
            }, 0) / Math.max(1, property.rooms.length * 30)) * 10000) / 100
          : 0,
        adr30d: bookings.length
          ? Math.round((revenue / Math.max(1, bookings.reduce((sum, b) => sum + Math.max(1, Math.round((new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / 86_400_000)), 0))) * 100) / 100
          : 0,
        revpar30d: property.rooms.length ? Math.round((revenue / Math.max(1, property.rooms.length * 30)) * 100) / 100 : 0,
        pickup7d: bookings.filter(b => new Date(b.createdAt).getTime() >= now.getTime() - 7 * 86_400_000).length,
      },
      roomStats, demandForecast, recommendations, generatedAt: new Date().toISOString(),
    };
  }
}
