'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { RequireAdmin } from '@/components/admin/require-admin';
import { AdminNav } from '@/components/admin/admin-nav';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { BookingStatus } from '@hbs/shared';

interface AdminBooking {
  id: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  status: string;
  totalPrice: number;
  guest: { name: string; email: string };
  room: { name: string; property: { name: string; host: { name: string } } };
}

const TRANSITIONS: BookingStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PAID',
  'CHECKED_IN',
  'CHECKED_OUT',
  'CANCELLED',
  'EXPIRED',
];

function statusTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'PAID' || status === 'CHECKED_IN' || status === 'CHECKED_OUT') return 'success';
  if (status === 'PENDING' || status === 'CONFIRMED') return 'warning';
  if (status === 'CANCELLED' || status === 'EXPIRED') return 'danger';
  return 'neutral';
}

export default function AdminBookingsPage() {
  return (
    <RequireAdmin>
      <AdminBookingsView />
    </RequireAdmin>
  );
}

function AdminBookingsView() {
  const [query, setQuery] = useState('');
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [transitionError, setTransitionError] = useState('');

  useEffect(() => {
    search();
  }, []);

  async function search() {
    setLoading(true);
    const res = await adminApi.get<AdminBooking[]>(`/admin/bookings${query ? `?q=${encodeURIComponent(query)}` : ''}`);
    if (res.success && res.data) setBookings(res.data);
    setLoading(false);
  }

  async function transition(bookingId: string, targetStatus: BookingStatus) {
    setActioningId(bookingId);
    setTransitionError('');
    const res = await adminApi.post(`/admin/bookings/${bookingId}/transition`, { targetStatus });
    if (res.success) {
      setExpandedId(null);
      await search();
    } else {
      setTransitionError(res.error?.message || 'Failed to change booking status');
    }
    setActioningId(null);
  }

  return (
    <div className="container-custom pt-28 pb-16 md:pt-32 max-w-5xl">
      <AdminNav />
      <h1 className="font-display text-3xl md:text-4xl font-bold text-surface-900 mb-6">Bookings</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
        className="flex gap-3 mb-8"
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Booking ID, guest email/name, or host email…"
          className="flex-1"
        />
        <button type="submit" className="btn-secondary text-sm">
          Search
        </button>
      </form>

      {transitionError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 text-sm">
          {transitionError}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card p-6 animate-pulse h-24" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <p className="text-surface-500 text-center py-16">No bookings found.</p>
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
                    {b.room.property.name} · {b.room.name} · host {b.room.property.host.name}
                  </p>
                  <p className="text-surface-500 text-sm mt-1">
                    {new Date(b.checkIn).toLocaleDateString()} → {new Date(b.checkOut).toLocaleDateString()}
                  </p>
                  <p className="text-surface-500 text-xs mt-1 font-mono">{b.id}</p>
                </div>

                <div className="text-right shrink-0 space-y-2">
                  <p className="text-lg font-bold text-brand-400">₹{b.totalPrice.toLocaleString('en-IN')}</p>
                  <button
                    onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                    className="text-xs text-surface-500 hover:text-surface-800 hover:underline"
                  >
                    {expandedId === b.id ? 'Cancel' : 'Change status'}
                  </button>
                </div>
              </div>

              {expandedId === b.id && (
                <div className="mt-4 pt-4 border-t border-surface-200 flex gap-2 flex-wrap">
                  {TRANSITIONS.filter((s) => s !== b.status).map((s) => (
                    <button
                      key={s}
                      onClick={() => transition(b.id, s)}
                      disabled={actioningId === b.id}
                      className="text-xs px-3 py-1.5 rounded-lg bg-surface-100 text-surface-600 border border-surface-300 hover:border-surface-400"
                    >
                      → {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
