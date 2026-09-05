'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { RequireAdmin } from '@/components/admin/require-admin';
import { AdminNav } from '@/components/admin/admin-nav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AdminHost {
  id: string;
  email: string;
  name: string;
  businessName: string | null;
  isActive: boolean;
  verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  verificationNote: string | null;
  verifiedAt: string | null;
  createdAt: string;
  _count: { properties: number };
}

function verificationTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'VERIFIED') return 'success';
  if (status === 'PENDING') return 'warning';
  if (status === 'REJECTED') return 'danger';
  return 'neutral';
}

export default function AdminHostsPage() {
  return (
    <RequireAdmin>
      <AdminHostsView />
    </RequireAdmin>
  );
}

function AdminHostsView() {
  const [hosts, setHosts] = useState<AdminHost[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  useEffect(() => {
    loadHosts();
  }, []);

  async function loadHosts() {
    setLoading(true);
    const res = await adminApi.get<AdminHost[]>('/admin/hosts');
    if (res.success && res.data) setHosts(res.data);
    setLoading(false);
  }

  async function toggleActive(host: AdminHost) {
    setActioningId(host.id);
    await adminApi.put(`/admin/hosts/${host.id}/active`, { isActive: !host.isActive });
    await loadHosts();
    setActioningId(null);
  }

  async function reviewVerification(hostId: string, decision: 'VERIFIED' | 'REJECTED') {
    setActioningId(hostId);
    await adminApi.put(`/admin/hosts/${hostId}/verification`, { decision });
    await loadHosts();
    setActioningId(null);
  }

  return (
    <div className="container-custom pt-28 pb-16 md:pt-32 max-w-5xl premium-admin-page">
      <AdminNav />
      <h1 className="font-display text-3xl md:text-4xl font-bold text-surface-900 mb-8">Hosts</h1>

      {loading ? (
        <div className="grid gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card p-6 animate-pulse h-24" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {hosts.map((host) => (
            <div key={host.id} className="card p-6">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-surface-900">{host.name}</h3>
                    {!host.isActive && <Badge tone="danger">Suspended</Badge>}
                    <Badge tone={verificationTone(host.verificationStatus)}>{host.verificationStatus}</Badge>
                  </div>
                  <p className="text-surface-500 text-sm">
                    {host.email}
                    {host.businessName && <> · {host.businessName}</>}
                  </p>
                  <p className="text-surface-500 text-xs mt-1">
                    {host._count.properties} propert{host._count.properties !== 1 ? 'ies' : 'y'} · joined{' '}
                    {new Date(host.createdAt).toLocaleDateString()}
                  </p>
                  {host.verificationNote && (
                    <p className="text-surface-500 text-xs mt-1">ID: {host.verificationNote}</p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  {host.verificationStatus === 'PENDING' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => reviewVerification(host.id, 'VERIFIED')}
                        disabled={actioningId === host.id}
                        className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => reviewVerification(host.id, 'REJECTED')}
                        disabled={actioningId === host.id}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={actioningId === host.id}
                    onClick={() => toggleActive(host)}
                  >
                    {host.isActive ? 'Suspend' : 'Reactivate'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
