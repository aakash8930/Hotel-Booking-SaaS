'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Booking } from '@hbs/shared';

export default function BookingConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBooking();
  }, [bookingId]);

  async function loadBooking() {
    const res = await api.get<Booking>(`/bookings/${bookingId}`);
    if (res.success && res.data) {
      setBooking(res.data);
    }
    setLoading(false);
  }

  if (loading) return <div className="p-8">Loading...</div>;
  if (!booking) return <div className="p-8">Booking not found</div>;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold mb-2">Booking Confirmed!</h1>
        <p className="text-surface-500">
          Your booking has been created successfully.
        </p>
      </div>

      <div className="card p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Booking Details</h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-surface-600">Booking ID:</span>
            <span className="font-mono text-sm">{booking.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-surface-600">Status:</span>
            <span
              className={`px-2 py-1 rounded text-sm ${
                booking.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-green-100 text-green-700'
              }`}
            >
              {booking.status}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-surface-600">Check-in:</span>
            <span className="font-medium">{new Date(booking.checkIn).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-surface-600">Check-out:</span>
            <span className="font-medium">{new Date(booking.checkOut).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-surface-600">Guests:</span>
            <span className="font-medium">{booking.guestCount}</span>
          </div>
          <div className="flex justify-between text-lg font-semibold pt-3 border-t">
            <span>Total:</span>
            <span>₹{booking.totalPrice.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {booking.status === 'pending' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>Payment pending:</strong> Your booking is held for 10 minutes. Complete payment to confirm your reservation.
          </p>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={() => router.push('/')}
          className="btn-primary flex-1"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
