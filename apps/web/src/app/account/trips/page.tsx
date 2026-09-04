'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { guestApi } from '@/lib/api';
import { useGuestSession, clearGuestSession } from '@/lib/guest-session';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TripBooking {
  id: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  status: string;
  totalPrice: number;
  currency: string;
  room: {
    name: string;
    property: { id: string; name: string; slug: string; city: string; state: string };
  };
  review: { id: string; rating: number } | null;
}

function statusTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'PAID' || status === 'CHECKED_IN' || status === 'CHECKED_OUT') return 'success';
  if (status === 'PENDING' || status === 'CONFIRMED') return 'warning';
  if (status === 'CANCELLED' || status === 'EXPIRED') return 'danger';
  return 'neutral';
}

export default function TripsPage() {
  const router = useRouter();
  const { profile, isLoggedIn, ready } = useGuestSession();
  const [trips, setTrips] = useState<TripBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!isLoggedIn) {
      router.replace('/account/login?next=/account/trips');
      return;
    }
    loadTrips();
  }, [ready, isLoggedIn]);

  async function loadTrips() {
    const res = await guestApi.get<TripBooking[]>('/guest/bookings');
    if (res.success && res.data) {
      setTrips(res.data);
    }
    setLoading(false);
  }

  function handleSignOut() {
    clearGuestSession();
    router.push('/');
  }

  if (!ready || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="container-custom pt-28 pb-16 md:pt-32 max-w-4xl">
      <div className="flex justify-between items-start mb-10">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-surface-900">My trips</h1>
          <p className="text-surface-500 mt-1">
            Signed in as {profile?.name} ({profile?.email})
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>

      {trips.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-surface-500 mb-4">No trips booked yet.</p>
          <Button href="/search">Find your first stay</Button>
        </div>
      ) : (
        <div className="grid gap-5">
          {trips.map((trip) => {
            const canReview =
              !trip.review &&
              (trip.status === 'CHECKED_OUT' ||
                ((trip.status === 'PAID' || trip.status === 'CHECKED_IN') &&
                  new Date(trip.checkOut) <= new Date()));

            return (
              <div key={trip.id} className="card p-6">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <Link
                      href={`/property/${trip.room.property.slug}`}
                      className="text-lg font-semibold text-surface-900 hover:text-brand-300 transition-colors"
                    >
                      {trip.room.property.name}
                    </Link>
                    <p className="text-surface-500 text-sm mt-0.5">
                      {trip.room.property.city}, {trip.room.property.state} · {trip.room.name}
                    </p>
                    <p className="text-surface-500 text-sm mt-2">
                      {new Date(trip.checkIn).toLocaleDateString()} →{' '}
                      {new Date(trip.checkOut).toLocaleDateString()} · {trip.guests} guest
                      {trip.guests !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0 space-y-2">
                    <Badge tone={statusTone(trip.status)}>{trip.status}</Badge>
                    <p className="text-lg font-bold text-brand-400">
                      ₹{trip.totalPrice.toLocaleString('en-IN')}
                    </p>
                    <div className="flex flex-col gap-2 items-end">
                      <Link
                        href={`/booking/${trip.id}/confirm`}
                        className="text-xs text-surface-500 hover:text-surface-800 hover:underline transition-colors"
                      >
                        View booking
                      </Link>
                      {trip.review && (
                        <Badge tone="brand">Reviewed · {trip.review.rating}★</Badge>
                      )}
                      {canReview && (
                        <Link
                          href={`/property/${trip.room.property.slug}?review=${trip.id}#reviews`}
                          className="text-xs text-brand-300 hover:underline"
                        >
                          Leave a review
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
