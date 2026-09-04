'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { RequireAdmin } from '@/components/admin/require-admin';
import { AdminNav } from '@/components/admin/admin-nav';
import { Badge } from '@/components/ui/badge';

interface AdminProperty {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  status: 'DRAFT' | 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  host: { id: string; name: string; email: string; verificationStatus: string };
  _count: { rooms: number };
}

export default function AdminPropertiesPage() {
  return (
    <RequireAdmin>
      <AdminPropertiesView />
    </RequireAdmin>
  );
}

function AdminPropertiesView() {
  const [properties, setProperties] = useState<AdminProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  useEffect(() => {
    loadProperties();
  }, []);

  async function loadProperties() {
    setLoading(true);
    const res = await adminApi.get<AdminProperty[]>('/admin/properties');
    if (res.success && res.data) setProperties(res.data);
    setLoading(false);
  }

  async function setStatus(propertyId: string, status: 'ACTIVE' | 'SUSPENDED') {
    setActioningId(propertyId);
    await adminApi.put(`/admin/properties/${propertyId}/status`, { status });
    await loadProperties();
    setActioningId(null);
  }

  return (
    <div className="container-custom pt-28 pb-16 md:pt-32 max-w-5xl">
      <AdminNav />
      <h1 className="font-display text-3xl md:text-4xl font-bold text-surface-900 mb-8">Properties</h1>

      {loading ? (
        <div className="grid gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card p-6 animate-pulse h-24" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {properties.map((p) => (
            <div key={p.id} className="card p-6">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-surface-900">{p.name}</h3>
                    <Badge tone={p.status === 'ACTIVE' ? 'success' : p.status === 'DRAFT' ? 'warning' : 'danger'}>
                      {p.status}
                    </Badge>
                  </div>
                  <p className="text-surface-500 text-sm">
                    {p.city}, {p.state} · {p._count.rooms} room{p._count.rooms !== 1 ? 's' : ''}
                  </p>
                  <p className="text-surface-500 text-xs mt-1">
                    Host: {p.host.name} ({p.host.email})
                    {p.host.verificationStatus === 'VERIFIED' && ' · Verified'}
                  </p>
                </div>

                <div className="flex gap-2 shrink-0">
                  {p.status !== 'SUSPENDED' ? (
                    <button
                      onClick={() => setStatus(p.id, 'SUSPENDED')}
                      disabled={actioningId === p.id}
                      className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20"
                    >
                      Suspend
                    </button>
                  ) : (
                    <button
                      onClick={() => setStatus(p.id, 'ACTIVE')}
                      disabled={actioningId === p.id}
                      className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                    >
                      Reactivate
                    </button>
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
