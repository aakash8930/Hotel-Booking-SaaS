'use client';

import { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { FieldLabel } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ShieldCheck, CreditCard } from 'lucide-react';
import type { Booking } from '@hbs/shared';

export default function BookingPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = params.id as string;

  const [formData, setFormData] = useState({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    checkIn: searchParams.get('checkIn') || '',
    checkOut: searchParams.get('checkOut') || '',
    guests: 2,
    specialRequests: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await api.post<Booking>('/bookings', {
      roomId,
      ...formData,
    });

    if (res.success && res.data) {
      router.push(`/booking/${res.data.id}/confirm`);
    } else {
      setError(res.error?.message || 'Failed to create booking');
      setLoading(false);
    }
  }

  return (
    <div className="container-custom pt-28 pb-20 md:pt-32 max-w-5xl premium-booking-page">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

        {/* Left Column: The Form */}
        <div className="lg:col-span-2">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-8 text-surface-900">
            Complete your booking
          </h1>

          {error && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="card p-6 md:p-8 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4 text-surface-900">Your details</h2>
                <div className="space-y-4">
                  <div>
                    <FieldLabel>Full name</FieldLabel>
                    <input
                      type="text"
                      className="input"
                      value={formData.guestName}
                      onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <FieldLabel>Email</FieldLabel>
                    <input
                      type="email"
                      className="input"
                      value={formData.guestEmail}
                      onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <FieldLabel>Phone</FieldLabel>
                    <input
                      type="tel"
                      className="input"
                      value={formData.guestPhone}
                      onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h2 className="text-xl font-semibold mb-4 text-surface-900">Stay details</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <FieldLabel>Check-in</FieldLabel>
                      <input
                        type="date"
                        className="input"
                        value={formData.checkIn}
                        onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <FieldLabel>Check-out</FieldLabel>
                      <input
                        type="date"
                        className="input"
                        value={formData.checkOut}
                        onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Number of Guests</FieldLabel>
                    <input
                      type="number"
                      className="input"
                      value={formData.guests}
                      onChange={(e) => setFormData({ ...formData, guests: parseInt(e.target.value) })}
                      min={1}
                      max={10}
                      required
                    />
                  </div>
                  <div>
                    <FieldLabel>Special Requests (optional)</FieldLabel>
                    <textarea
                      className="input"
                      value={formData.specialRequests}
                      onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
                      rows={3}
                      placeholder="Early check-in, extra pillows, etc."
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <Button type="submit" className="flex-1 py-6 text-lg" disabled={loading}>
                {loading ? 'Processing secure booking...' : 'Confirm booking'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => router.back()} className="px-8">
                Cancel
              </Button>
            </div>
          </form>
        </div>

        {/* Right Column: Trust & Summary */}
        <div className="space-y-6">
          <div className="card p-6 sticky top-32">
            <h3 className="font-semibold mb-6 text-surface-900 text-lg">Booking Summary</h3>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Check-in</span>
                <span className="font-medium text-surface-900">{formData.checkIn}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Check-out</span>
                <span className="font-medium text-surface-900">{formData.checkOut}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Guests</span>
                <span className="font-medium text-surface-900">{formData.guests}</span>
              </div>
              <div className="h-px bg-surface-200 my-4" />
              <div className="flex justify-between items-center">
                <span className="text-surface-900 font-semibold">Total Price</span>
                <span className="text-2xl font-bold text-brand-400">₹ --</span>
              </div>
            </div>

            <div className="space-y-4 border-t border-surface-200 pt-6">
              <div className="flex gap-3 items-start text-xs text-surface-500">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <p>Database-level guarantee: Your room is locked the moment you book.</p>
              </div>
              <div className="flex gap-3 items-start text-xs text-surface-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <p>Secure UPI payment via PhonePe encrypted gateway.</p>
              </div>
              <div className="flex gap-3 items-start text-xs text-surface-500">
                <CreditCard className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <p>Instant confirmation sent via Email and WhatsApp.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
