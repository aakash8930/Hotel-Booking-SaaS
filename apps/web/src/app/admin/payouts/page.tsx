'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { RequireAdmin } from '@/components/admin/require-admin';
import { AdminNav } from '@/components/admin/admin-nav';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { Payout } from '@hbs/shared';

interface AdminPayout extends Payout {
  host: { id: string; name: string; businessName: string | null; email: string };
}

export default function AdminPayoutsPage() {
  return (
    <RequireAdmin>
      <AdminPayoutsView />
    </RequireAdmin>
  );
}

function AdminPayoutsView() {
  const [payouts, setPayouts] = useState<AdminPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [referenceDrafts, setReferenceDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    loadPayouts();
  }, []);

  async function loadPayouts() {
    setLoading(true);
    const res = await adminApi.get<AdminPayout[]>('/admin/payouts');
    if (res.success && res.data) setPayouts(res.data);
    setLoading(false);
  }

  async function markPaid(payoutId: string) {
    setActioningId(payoutId);
    await adminApi.post(`/admin/payouts/${payoutId}/mark-paid`, {
      payoutReference: referenceDrafts[payoutId] || undefined,
    });
    await loadPayouts();
    setActioningId(null);
  }

  return (
    <div className="container-custom pt-28 pb-16 md:pt-32 max-w-6xl premium-admin-page">
      <AdminNav />
      <h1 className="font-display text-3xl md:text-4xl font-bold text-surface-900 mb-8">Payouts</h1>

      {loading ? (
        <div className="grid gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card p-6 animate-pulse h-24" />
          ))}
        </div>
      ) : payouts.length === 0 ? (
        <p className="text-surface-500 text-center py-16">No payout batches yet.</p>
      ) : (
        <div className="grid gap-4">
          {payouts.map((p) => (
            <div key={p.id} className="card p-6">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-surface-900">
                      {p.host.businessName || p.host.name}
                    </h3>
                    <Badge tone={p.status === 'PAID' ? 'success' : 'warning'}>{p.status}</Badge>
                  </div>
                  <p className="text-surface-500 text-sm">{p.host.email}</p>
                  <p className="text-surface-500 text-sm mt-1">
                    {p.bookingCount} booking{p.bookingCount !== 1 ? 's' : ''} ·{' '}
                    {new Date(p.periodStart).toLocaleDateString()} → {new Date(p.periodEnd).toLocaleDateString()}
                  </p>
                  {p.paidAt && (
                    <p className="text-surface-500 text-xs mt-1">
                      Paid {new Date(p.paidAt).toLocaleDateString()}
                      {p.payoutReference && ` · ref ${p.payoutReference}`}
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0 space-y-2">
                  <p className="text-lg font-bold text-brand-400">₹{p.netPayable.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-surface-500">
                    gross ₹{p.grossAmount.toLocaleString('en-IN')} − fee ₹{p.platformFee.toLocaleString('en-IN')}
                  </p>

                  {p.status === 'PENDING' && (
                    <div className="flex flex-col items-end gap-2 pt-2">
                      <Input
                        placeholder="Bank ref (optional)"
                        value={referenceDrafts[p.id] || ''}
                        onChange={(e) => setReferenceDrafts({ ...referenceDrafts, [p.id]: e.target.value })}
                        className="text-xs w-48"
                      />
                      <button
                        onClick={() => markPaid(p.id)}
                        disabled={actioningId === p.id}
                        className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                      >
                        Mark paid
                      </button>
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
