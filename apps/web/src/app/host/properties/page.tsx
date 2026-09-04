'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RequireHost } from '@/components/host/require-host';
import { useHostSession, clearHostSession } from '@/lib/host-session';
import type { HostAnalytics } from '@hbs/shared';

interface Property {
  id: string;
  name: string;
  city: string;
  state: string;
  status: string;
  rooms: unknown[];
  _count: { rooms: number };
}

export default function HostPropertiesPage() {
  return (
    <RequireHost>
      <HostPropertiesDashboard />
    </RequireHost>
  );
}

function HostPropertiesDashboard() {
  const router = useRouter();
  const { profile } = useHostSession();
  const [properties, setProperties] = useState<Property[]>([]);
  const [analytics, setAnalytics] = useState<HostAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProperties();
    api.get<HostAnalytics>('/host/analytics').then((res) => {
      if (res.success && res.data) setAnalytics(res.data);
    });
  }, []);

  async function loadProperties() {
    const res = await api.get<Property[]>('/host/properties');
    if (res.success && res.data) {
      setProperties(res.data);
    }
    setLoading(false);
  }

  function handleSignOut() {
    clearHostSession();
    router.push('/');
  }

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="container-custom pt-28 pb-16 md:pt-32 max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-surface-900">My properties</h1>
          {profile && <p className="text-surface-500 text-sm mt-1">Signed in as {profile.name}</p>}
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => router.push('/host/bookings')}>
            Bookings
          </Button>
          <Button variant="secondary" onClick={() => router.push('/host/billing')}>
            Billing
          </Button>
          <Button onClick={() => router.push('/host/properties/new')}>+ Add property</Button>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </div>

      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <div className="card p-5">
            <p className="text-xs text-surface-500 mb-1">Total revenue</p>
            <p className="text-2xl font-bold text-brand-400">₹{analytics.totalRevenue.toLocaleString('en-IN')}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-surface-500 mb-1">Bookings</p>
            <p className="text-2xl font-bold text-surface-900">{analytics.totalBookings}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-surface-500 mb-1">Check-ins this week</p>
            <p className="text-2xl font-bold text-surface-900">{analytics.upcomingCheckIns}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-surface-500 mb-1">Avg. rating</p>
            <p className="text-2xl font-bold text-surface-900">
              {analytics.averageRating ? `${analytics.averageRating} ★` : '—'}
            </p>
            {analytics.reviewCount > 0 && (
              <p className="text-xs text-surface-500 mt-0.5">{analytics.reviewCount} reviews</p>
            )}
          </div>
        </div>
      )}

      {properties.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-surface-500 mb-4">No properties yet.</p>
          <Button onClick={() => router.push('/host/properties/new')}>
            Create your first property
          </Button>
        </div>
      ) : (
        <div className="grid gap-6">
          {properties.map((p) => (
            <div
              key={p.id}
              className="card p-6 cursor-pointer"
              onClick={() => router.push(`/host/properties/${p.id}`)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-surface-900">{p.name}</h2>
                  <p className="text-surface-500">
                    {p.city}, {p.state}
                  </p>
                  <p className="text-sm text-surface-500 mt-1">
                    {p._count.rooms} room{p._count.rooms !== 1 ? 's' : ''}
                  </p>
                </div>
                <Badge tone={p.status === 'ACTIVE' ? 'success' : p.status === 'DRAFT' ? 'warning' : 'danger'}>
                  {p.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
