'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { RequireHost } from '@/components/host/require-host';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { HostBooking, RefundPreview, BookingStatus } from '@hbs/shared';

interface HostProperty {
  id: string;
  name: string;
}

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PAID', label: 'Paid' },
  { value: 'CHECKED_IN', label: 'Checked in' },
  { value: 'CHECKED_OUT', label: 'Checked out' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'EXPIRED', label: 'Expired' },
];

function statusTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'PAID' || status === 'CHECKED_IN' || status === 'CHECKED_OUT') return 'success';
  if (status === 'PENDING' || status === 'CONFIRMED') return 'warning';
  if (status === 'CANCELLED' || status === 'EXPIRED') return 'danger';
  return 'neutral';
}

export default function HostBookingsPage() {
  return (
    <RequireHost>
      <HostBookingsView />
    </RequireHost>
  );
}

function HostBookingsView() {
  const router = useRouter();
  const [bookings, setBookings] = useState<HostBooking[]>([]);
  const [properties, setProperties] = useState<HostProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [cancelPreview, setCancelPreview] = useState<{ id: string; refund: RefundPreview } | null>(null);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    api.get<HostProperty[]>('/host/properties').then((res) => {
      if (res.success && res.data) setProperties(res.data);
    });
  }, []);

  useEffect(() => {
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, propertyFilter]);

  async function loadBookings() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (propertyFilter) params.set('propertyId', propertyFilter);
    const res = await api.get<HostBooking[]>(`/host/bookings?${params.toString()}`);
    if (res.success && res.data) setBookings(res.data);
    setLoading(false);
  }

  async function transition(bookingId: string, targetStatus: BookingStatus) {
    setActioningId(bookingId);
    setActionError('');
    const res = await api.post('/payments/transition', { bookingId, targetStatus });
    if (res.success) {
      await loadBookings();
    } else {
      setActionError(res.error?.message || 'Failed to update booking');
    }
    setActioningId(null);
  }

  async function openCancelPreview(bookingId: string) {
    setActioningId(bookingId);
    const res = await api.get<RefundPreview>(`/bookings/${bookingId}/cancellation-preview`);
    if (res.success && res.data) {
      setCancelPreview({ id: bookingId, refund: res.data });
    }
    setActioningId(null);
  }

  async function confirmCancel(bookingId: string) {
    setActioningId(bookingId);
    setActionError('');
    const res = await api.post(`/bookings/${bookingId}/cancel`, {});
    if (res.success) {
      setCancelPreview(null);
      await loadBookings();
    } else {
      setActionError(res.error?.message || 'Failed to cancel booking');
    }
    setActioningId(null);
  }

  return (
    <div className="container-custom pt-28 pb-16 md:pt-32 max-w-5xl">
      <button
        onClick={() => router.push('/host/properties')}
        className="text-sm text-surface-500 mb-4 hover:text-surface-800 hover:underline transition-colors"
      >
        ← Back to properties
      </button>
      <h1 className="font-display text-3xl md:text-4xl font-bold text-surface-900 mb-8">Bookings</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input text-sm w-auto"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={propertyFilter}
          onChange={(e) => setPropertyFilter(e.target.value)}
          className="input text-sm w-auto"
        >
          <option value="">All properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {actionError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 text-sm">
          {actionError}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card p-6 animate-pulse h-28" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <p className="text-surface-500 text-center py-16">No bookings match these filters.</p>
      ) : (
        <div className="grid gap-4">
          {bookings.map((b) => (
            <div key={b.id} className="card p-6">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-surface-900">{b.guest.name}</h3>
                    <Badge tone={statusTone(b.status)}>{b.status}</Badge>
                  </div>
                  <p className="text-surface-500 text-sm">
                    {b.room.property.name} · {b.room.name}
                  </p>
                  <p className="text-surface-500 text-sm mt-1">
                    {new Date(b.checkIn).toLocaleDateString()} → {new Date(b.checkOut).toLocaleDateString()} ·{' '}
                    {b.guests} guest{b.guests !== 1 ? 's' : ''}
                  </p>
                  <p className="text-surface-500 text-xs mt-1">
                    {b.guest.email}
                    {b.guest.phone && <> · {b.guest.phone}</>}
                  </p>
                </div>

                <div className="text-right shrink-0 space-y-2">
                  <p className="text-lg font-bold text-brand-400">₹{b.totalPrice.toLocaleString('en-IN')}</p>
                  {b.platformFee > 0 && (
                    <p className="text-xs text-surface-500">platform fee ₹{b.platformFee.toLocaleString('en-IN')}</p>
                  )}

                  {cancelPreview?.id === b.id ? (
                    <div className="text-left bg-surface-200/50 border border-surface-300 rounded-lg p-3 max-w-xs">
                      <p className="text-xs text-surface-600 mb-2">
                        {cancelPreview.refund.refundAmount > 0
                          ? `Refund: ₹${cancelPreview.refund.refundAmount.toLocaleString('en-IN')} (${cancelPreview.refund.refundPercent}%)`
                          : 'No refund applies at this timing.'}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => confirmCancel(b.id)}
                          disabled={actioningId === b.id}
                          className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20"
                        >
                          Confirm cancel
                        </button>
                        <button
                          onClick={() => setCancelPreview(null)}
                          className="text-xs px-3 py-1.5 rounded-lg text-surface-600 hover:bg-surface-200"
                        >
                          Keep
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 justify-end flex-wrap">
                      {b.status === 'PAID' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={actioningId === b.id}
                          onClick={() => transition(b.id, 'CHECKED_IN')}
                        >
                          Check in
                        </Button>
                      )}
                      {b.status === 'CHECKED_IN' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={actioningId === b.id}
                          onClick={() => transition(b.id, 'CHECKED_OUT')}
                        >
                          Check out
                        </Button>
                      )}
                      {['PENDING', 'CONFIRMED', 'PAID', 'CHECKED_IN'].includes(b.status) && (
                        <button
                          onClick={() => openCancelPreview(b.id)}
                          disabled={actioningId === b.id}
                          className="text-xs px-3 py-1.5 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
