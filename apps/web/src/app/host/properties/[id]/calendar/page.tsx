'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { AvailabilityCalendar } from '@/components/host/availability-calendar';
import type { Property, Room, Booking } from '@hbs/shared';

export default function PropertyCalendarPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params.id as string;

  const [property, setProperty] = useState<Property | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [propertyId]);

  async function loadData() {
    setLoading(true);
    try {
      const propRes = await api.get(`/host/properties/${propertyId}`);
      if (propRes.success && propRes.data) {
        setProperty(propRes.data);
      }
      const roomsRes = await api.get(`/host/properties/${propertyId}/rooms`);
      if (roomsRes.success && roomsRes.data) {
        setRooms(roomsRes.data);
      }
      const bookingsRes = await api.get(`/host/bookings`); // Simplified for pilot
      if (bookingsRes.success && bookingsRes.data) {
        setBookings(bookingsRes.data);
      }
    } catch (e) {
      console.error('Error loading calendar data:', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="container-custom pt-32 pb-16">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl font-bold text-surface-900 mb-2">
            Availability Calendar
          </h1>
          <p className="text-surface-500">Visual overview of room occupancy for {property?.name}.</p>
        </div>
        <Button onClick={() => router.push(`/host/properties/${propertyId}`)}>
          Back to Property
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-brand-500 rounded-sm" />
              <span className="text-sm text-surface-600">Booked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-white border border-surface-200 rounded-sm" />
              <span className="text-sm text-surface-600">Available</span>
            </div>
          </div>
          <div className="text-sm text-surface-500">
            Viewing next 30 days
          </div>
        </div>

        <AvailabilityCalendar rooms={rooms} bookings={bookings} />
      </motion.div>
    </div>
  );
}
