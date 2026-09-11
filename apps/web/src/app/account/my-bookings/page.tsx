'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Booking } from '@hbs/shared';

export default function MyBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBookings() {
      const res = await api.get<Booking[]>('/guest/bookings');
      if (res.success && res.data) {
        setBookings(res.data);
      }
      setLoading(false);
    }
    loadBookings();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="container-custom pt-32 pb-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="mb-12 flex justify-between items-end">
          <div>
            <h1 className="font-display text-4xl font-bold text-surface-900 mb-2">My Trips</h1>
            <p className="text-surface-500">Your upcoming and past adventures.</p>
          </div>
          <Button onClick={() => router.push('/search')} variant="outline">
            Find new stay
          </Button>
        </div>

        {bookings.length === 0 ? (
          <div className="card p-12 text-center space-y-4">
            <div className="text-4xl mb-2">🏨</div>
            <h2 className="text-xl font-semibold text-surface-900">No bookings yet</h2>
            <p className="text-surface-500 max-w-xs mx-auto">
              You haven't booked any stays yet. Start exploring independent homes across India.
            </p>
            <Button onClick={() => router.push('/search')} className="mt-4">
              Explore stays
            </Button>
          </div>
        ) : (
          <div className="grid gap-6">
            {bookings.map((booking) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-6 flex flex-col md:flex-row justify-between gap-6 hover:border-brand-500/30 transition-colors"
              >
                <div className="flex gap-6">
                  <div className="w-24 h-24 rounded-xl bg-surface-100 overflow-hidden shrink-0 relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-500/20 to-transparent" />
                    <span className="absolute inset-0 flex items-center justify-center text-2xl">🏨</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-xl font-semibold text-surface-900">Booking #{booking.id.slice(0, 8)}</h3>
                      <Badge tone={
                        booking.status === 'PAID' ? 'success' :
                        booking.status === 'CONFIRMED' ? 'info' :
                        booking.status === 'CANCELLED' ? 'error' : 'neutral'
                      }>
                        {booking.status}
                      </Badge>
                    </div>
                    <p className="text-surface-500 text-sm mb-4">
                      {new Date(booking.checkIn).toLocaleDateString()} — {new Date(booking.checkOut).toLocaleDateString()}
                    </p>
                    <div className="flex gap-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/booking/${booking.id}`)}
                      >
                        View Details
                      </Button>
                      {booking.status === 'CONFIRMED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 border-red-100 hover:bg-red-50"
                          onClick={() => {
                            if (confirm('Are you sure you want to cancel this booking?')) {
                              // call api.post(`/bookings/${booking.id}/cancel`)
                            }
                          }}
                        >
                          Cancel Trip
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right flex flex-col justify-center">
                  <p className="text-sm text-surface-500">Total Price</p>
                  <p className="text-2xl font-bold text-surface-900">
                    ₹{Number(booking.totalPrice).toLocaleString('en-IN')}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
