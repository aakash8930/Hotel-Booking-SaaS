'use client';

import { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { FieldLabel } from '@/components/ui/input';
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
      // Redirect to confirmation page
      router.push(`/booking/${res.data.id}/confirm`);
    } else {
      setError(res.error?.message || 'Failed to create booking');
      setLoading(false);
    }
  }

  return (
    <div className="container-custom pt-28 pb-20 md:pt-32 max-w-4xl premium-booking-page">
      <h1 className="font-display text-3xl md:text-4xl font-bold mb-8 text-surface-900">
        Complete your booking
      </h1>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 md:p-8 space-y-8">
        <div>
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

        <div>
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

        <div className="bg-surface-200/50 border border-surface-300 rounded-xl p-6">
          <h3 className="font-semibold mb-3 text-surface-900">Booking summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-surface-600">Check-in:</span>
              <span className="font-medium text-surface-900">{formData.checkIn}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-600">Check-out:</span>
              <span className="font-medium text-surface-900">{formData.checkOut}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-600">Guests:</span>
              <span className="font-medium text-surface-900">{formData.guests}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? 'Creating booking…' : 'Confirm booking'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
