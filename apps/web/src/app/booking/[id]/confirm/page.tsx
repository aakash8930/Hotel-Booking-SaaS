'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Booking, PaymentMethod, RefundPreview } from '@hbs/shared';

const ACTIVE_STATUSES = new Set(['PENDING', 'CONFIRMED', 'PAID', 'CHECKED_IN']);

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'UPI', label: 'UPI', icon: '📱' },
  { value: 'CARD', label: 'Card', icon: '💳' },
  { value: 'NETBANKING', label: 'Netbanking', icon: '🏦' },
  { value: 'WALLET', label: 'Wallet', icon: '👛' },
];

export default function BookingConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');

  const [showCancelPanel, setShowCancelPanel] = useState(false);
  const [refundPreview, setRefundPreview] = useState<RefundPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [cancelResult, setCancelResult] = useState<RefundPreview | null>(null);

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

  async function handlePayNow() {
    setPayLoading(true);
    setPayError('');

    const res = await api.post<{ redirectUrl: string }>('/payments/initiate', {
      bookingId,
      method: paymentMethod,
    });

    if (res.success && res.data) {
      window.location.href = res.data.redirectUrl;
    } else {
      setPayError(res.error?.message || 'Failed to start payment');
      setPayLoading(false);
    }
  }

  async function openCancelPanel() {
    setShowCancelPanel(true);
    setPreviewLoading(true);
    const res = await api.get<RefundPreview>(`/bookings/${bookingId}/cancellation-preview`);
    if (res.success && res.data) {
      setRefundPreview(res.data);
    }
    setPreviewLoading(false);
  }

  async function handleConfirmCancel() {
    setCancelLoading(true);
    setCancelError('');

    const res = await api.post<Booking & { refund: RefundPreview }>(`/bookings/${bookingId}/cancel`, {});

    if (res.success && res.data) {
      setBooking(res.data);
      setCancelResult(res.data.refund);
      setShowCancelPanel(false);
    } else {
      setCancelError(res.error?.message || 'Failed to cancel booking');
    }
    setCancelLoading(false);
  }

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  if (!booking)
    return (
      <div className="min-h-screen flex items-center justify-center text-surface-500">
        Booking not found
      </div>
    );

  const isPending = booking.status === 'PENDING' || booking.status === 'CONFIRMED';
  const isDead = booking.status === 'CANCELLED' || booking.status === 'EXPIRED';
  const canCancel = ACTIVE_STATUSES.has(booking.status);

  return (
    <div className="container-custom pt-28 pb-16 md:pt-32 max-w-2xl">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/15 border border-emerald-500/30 rounded-full mb-4">
          <svg
            className="w-8 h-8 text-emerald-400"
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
        <h1 className="font-display text-3xl font-bold mb-2 text-surface-900">Booking confirmed!</h1>
        <p className="text-surface-500">
          Your booking has been created successfully.
        </p>
      </div>

      <div className="card p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 text-surface-900">Booking details</h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-surface-600">Booking ID:</span>
            <span className="font-mono text-sm text-surface-800">{booking.id}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-surface-600">Status:</span>
            <Badge tone={isPending ? 'warning' : isDead ? 'danger' : 'success'}>
              {booking.status}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-surface-600">Check-in:</span>
            <span className="font-medium text-surface-900">{new Date(booking.checkIn).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-surface-600">Check-out:</span>
            <span className="font-medium text-surface-900">{new Date(booking.checkOut).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-surface-600">Guests:</span>
            <span className="font-medium text-surface-900">{booking.guests}</span>
          </div>
          <div className="flex justify-between text-lg font-semibold pt-3 border-t border-surface-300 text-surface-900">
            <span>Total:</span>
            <span className="text-brand-400">₹{booking.totalPrice.toLocaleString('en-IN')}</span>
          </div>
        </div>
        {!isPending && !isDead && (
          <a
            href={`/booking/${booking.id}/invoice`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-4 text-sm text-brand-300 hover:underline"
          >
            View tax invoice →
          </a>
        )}
      </div>

      {isPending && (
        <>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
            <p className="text-sm text-amber-300">
              <strong className="text-amber-200">Payment pending:</strong> Your booking is held for 10 minutes. Complete payment to confirm your reservation.
            </p>
          </div>

          {!showCancelPanel && (
            <div className="card p-6 mb-6">
              <h3 className="font-semibold text-surface-900 mb-3 text-sm">Pay with</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setPaymentMethod(m.value)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-sm transition-colors ${
                      paymentMethod === m.value
                        ? 'border-brand-500 ring-2 ring-brand-500/30 bg-brand-500/5 text-surface-900'
                        : 'border-surface-300 text-surface-600 hover:border-surface-400'
                    }`}
                  >
                    <span className="text-xl">{m.icon}</span>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {cancelResult && (
        <div className="bg-surface-200/50 border border-surface-300 rounded-xl p-4 mb-6 text-sm text-surface-700">
          Booking cancelled.{' '}
          {cancelResult.refundAmount > 0
            ? `A refund of ₹${cancelResult.refundAmount.toLocaleString('en-IN')} (${cancelResult.refundPercent}%) applies per the property's cancellation policy.`
            : "No refund applies per the property's cancellation policy for this cancellation timing."}
        </div>
      )}

      {payError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-4 rounded-xl mb-6">
          {payError}
        </div>
      )}

      {showCancelPanel && (
        <div className="card p-6 mb-6 border-red-500/30">
          <h3 className="font-semibold text-surface-900 mb-3">Cancel this booking?</h3>
          {previewLoading ? (
            <p className="text-sm text-surface-500">Checking your refund eligibility…</p>
          ) : refundPreview ? (
            <p className="text-sm text-surface-600 mb-4">
              {refundPreview.refundAmount > 0
                ? `You'll be refunded ₹${refundPreview.refundAmount.toLocaleString('en-IN')} (${refundPreview.refundPercent}% of the total), per the property's cancellation policy.`
                : "This cancellation isn't eligible for a refund under the property's cancellation policy."}
            </p>
          ) : null}
          {cancelError && <p className="text-sm text-red-400 mb-3">{cancelError}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleConfirmCancel}
              disabled={cancelLoading || previewLoading}
              className="inline-flex items-center justify-center px-4 py-2 text-sm rounded-lg font-semibold bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 hover:border-red-400/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelLoading ? 'Cancelling…' : 'Confirm cancellation'}
            </button>
            <Button variant="ghost" size="sm" onClick={() => setShowCancelPanel(false)}>
              Keep booking
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        {isPending && !showCancelPanel && (
          <>
            <Button onClick={handlePayNow} disabled={payLoading} className="flex-1">
              {payLoading
                ? 'Redirecting…'
                : `Pay now with ${PAYMENT_METHODS.find((m) => m.value === paymentMethod)?.label}`}
            </Button>
            <Button variant="secondary" onClick={openCancelPanel}>
              Cancel
            </Button>
          </>
        )}
        {!isPending && canCancel && !showCancelPanel && (
          <>
            <Button href="/" className="flex-1">
              Back to home
            </Button>
            <Button variant="secondary" onClick={openCancelPanel}>
              Cancel booking
            </Button>
          </>
        )}
        {(isDead || booking.status === 'CHECKED_OUT') && (
          <Button href="/" className="flex-1">
            Back to home
          </Button>
        )}
      </div>
    </div>
  );
}
