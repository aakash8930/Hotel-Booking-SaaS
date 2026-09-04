'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { RequireAdmin } from '@/components/admin/require-admin';
import { AdminNav } from '@/components/admin/admin-nav';

interface AdminStats {
  hostCount: number;
  guestCount: number;
  activeProperties: number;
  totalProperties: number;
  totalRevenue: number;
  totalBookings: number;
  pendingVerifications: number;
  pendingPayouts: number;
  reportedReviews: number;
}

export default function AdminDashboardPage() {
  return (
    <RequireAdmin>
      <AdminDashboardView />
    </RequireAdmin>
  );
}

function AdminDashboardView() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.get<AdminStats>('/admin/stats').then((res) => {
      if (res.success && res.data) setStats(res.data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="container-custom pt-28 pb-16 md:pt-32 max-w-5xl">
      <AdminNav />
      <h1 className="font-display text-3xl md:text-4xl font-bold text-surface-900 mb-8">Dashboard</h1>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card p-5 animate-pulse h-24" />
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
            <StatCard label="Total revenue" value={`₹${stats.totalRevenue.toLocaleString('en-IN')}`} accent />
            <StatCard label="Bookings" value={stats.totalBookings} />
            <StatCard label="Hosts" value={stats.hostCount} />
            <StatCard label="Guests" value={stats.guestCount} />
            <StatCard label="Active properties" value={`${stats.activeProperties} / ${stats.totalProperties}`} />
            <StatCard label="Pending payouts" value={stats.pendingPayouts} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {stats.pendingVerifications > 0 && (
              <div className="card p-5 border-amber-500/30 bg-amber-500/5">
                <p className="text-sm text-amber-300">
                  <strong className="text-amber-200">{stats.pendingVerifications}</strong> host
                  verification{stats.pendingVerifications !== 1 ? 's' : ''} awaiting review.
                </p>
              </div>
            )}
            {stats.reportedReviews > 0 && (
              <div className="card p-5 border-red-500/30 bg-red-500/5">
                <p className="text-sm text-red-300">
                  <strong className="text-red-200">{stats.reportedReviews}</strong> review
                  {stats.reportedReviews !== 1 ? 's' : ''} reported and awaiting moderation.
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="text-surface-500">Could not load dashboard stats.</p>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="card p-5">
      <p className="text-xs text-surface-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ? 'text-brand-400' : 'text-surface-900'}`}>{value}</p>
    </div>
  );
}
