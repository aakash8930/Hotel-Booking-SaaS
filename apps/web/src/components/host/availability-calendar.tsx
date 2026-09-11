'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Room, Booking } from '@hbs/shared';
import { Badge } from '@/components/ui/badge';

interface AvailabilityCalendarProps {
  rooms: Room[];
  bookings: Booking[];
  startDate?: Date;
}

export function AvailabilityCalendar({ rooms, bookings, startDate }: AvailabilityCalendarProps) {
  const dateRange = useMemo(() => {
    const start = startDate || new Date();
    const days = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, [startDate]);

  const isBooked = (roomId: string, date: Date) => {
    return bookings.some(b =>
      b.roomId === roomId &&
      date >= new Date(b.checkIn) &&
      date < new Date(b.checkOut) &&
      b.status !== 'CANCELLED'
    );
  };

  return (
    <div className="overflow-x-auto pb-4">
      <div className="inline-block min-w-full align-middle">
        <div className="grid grid-cols-[150px_repeat(30,1fr)] gap-0 border-l border-t border-surface-200">
          {/* Header Row */}
          <div className="bg-surface-100 p-3 font-semibold text-surface-500 text-xs border-r border-b border-surface-200 sticky left-0 z-10">
            Rooms
          </div>
          {dateRange.map((date, i) => (
            <div
              key={i}
              className="bg-surface-100 p-3 text-center font-medium text-surface-600 text-[10px] border-r border-b border-surface-200 min-w-[40px]"
            >
              {date.getDate()}
              <div className="text-[8px] opacity-50 uppercase">{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
            </div>
          ))}

          {/* Room Rows */}
          {rooms.map((room) => (
            <>
              <div className="p-3 border-r border-b border-surface-200 bg-surface-50 text-sm font-medium text-surface-900 sticky left-0 z-10 truncate">
                {room.name}
              </div>
              {dateRange.map((date, i) => {
                const booked = isBooked(room.id, date);
                return (
                  <div
                    key={i}
                    className={`h-12 border-r border-b border-surface-100 transition-colors ${
                      booked ? 'bg-brand-500/20' : 'bg-white hover:bg-surface-50'
                    }`}
                  >
                    {booked && (
                      <div className="h-full w-full px-1 flex items-center justify-center">
                        <div className="h-full w-full bg-brand-500 rounded-sm opacity-80" />
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>
    </div>
  );
}
