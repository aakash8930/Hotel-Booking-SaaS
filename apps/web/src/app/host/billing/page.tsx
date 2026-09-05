'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { RequireHost } from '@/components/host/require-host';
import { VerificationCard } from '@/components/host/verification-card';
import { GstinCard } from '@/components/host/gstin-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Payout, PayoutBalance } from '@hbs/shared';

type BillingPlan = 'COMMISSION' | 'SUBSCRIPTION';

interface BillingInfo {
  billingPlan: BillingPlan;
  commissionRate: number;
  subscriptionFee: number;
  billingPlanSetAt: string | null;
}

export default function HostBillingPage() {
  return (
    <RequireHost>
      <HostBillingView />
    </RequireHost>
  );
}

function HostBillingView() {
  const router = useRouter();
  const [plan, setPlan] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [balance, setBalance] = useState<PayoutBalance | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [payoutsLoading, setPayoutsLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [payoutError, setPayoutError] = useState('');

  useEffect(() => {
    loadPlan();
    loadPayouts();
  }, []);

  async function loadPlan() {
    const res = await api.get<BillingInfo>('/host/billing');
    if (res.success && res.data) {
      setPlan(res.data);
    } else {
      setError(res.error?.message || 'Failed to load billing settings');
    }
    setLoading(false);
  }

  async function loadPayouts() {
    setPayoutsLoading(true);
    const [balanceRes, payoutsRes] = await Promise.all([
      api.get<PayoutBalance>('/host/payouts/balance'),
      api.get<Payout[]>('/host/payouts'),
    ]);
    if (balanceRes.success && balanceRes.data) setBalance(balanceRes.data);
    if (payoutsRes.success && payoutsRes.data) setPayouts(payoutsRes.data);
    setPayoutsLoading(false);
  }

  async function handleRequestPayout() {
    setRequesting(true);
    setPayoutError('');
    const res = await api.post<Payout>('/host/payouts');
    if (res.success) {
      await loadPayouts();
    } else {
      setPayoutError(res.error?.message || 'Failed to request payout');
    }
    setRequesting(false);
  }

  async function choosePlan(billingPlan: BillingPlan) {
    if (!plan || billingPlan === plan.billingPlan) return;
    setSaving(true);
    setError('');

    const res = await api.put<BillingInfo>('/host/billing', { billingPlan });
    if (res.success && res.data) {
      setPlan(res.data);
    } else {
      setError(res.error?.message || 'Failed to update billing plan');
    }
    setSaving(false);
  }

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center premium-billing-page">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  if (!plan) {
    return (
      <div className="container-custom pt-28 pb-16 md:pt-32 max-w-2xl">
        <p className="text-red-400">{error || 'Could not load billing settings.'}</p>
      </div>
    );
  }

  return (
    <div className="container-custom pt-28 pb-16 md:pt-32 max-w-2xl">
      <button onClick={() => router.back()} className="text-sm text-surface-500 mb-4 hover:text-surface-800 hover:underline transition-colors">
        ← Back
      </button>
      <h1 className="font-display text-3xl md:text-4xl font-bold mb-2 text-surface-900">Billing</h1>

      <div className="mb-8 space-y-6">
        <VerificationCard />
        <GstinCard />
      </div>

      <p className="text-surface-500 mb-8">
        Choose how StayEase charges for using the platform.
      </p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-4 mb-8">
        <button
          onClick={() => choosePlan('COMMISSION')}
          disabled={saving}
          className={`text-left card p-6 transition-colors disabled:opacity-60 ${
            plan.billingPlan === 'COMMISSION' ? 'border-brand-500 ring-2 ring-brand-500/30' : ''
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-lg font-semibold text-surface-900">Per-booking commission</h2>
            {plan.billingPlan === 'COMMISSION' && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-500/15 text-brand-300 border border-brand-500/30">
                Current plan
              </span>
            )}
          </div>
          <p className="text-surface-600 text-sm">
            Pay {plan.commissionRate}% of each booking&apos;s total. Nothing due if you get no
            bookings — the simplest option while you&apos;re getting started.
          </p>
        </button>

        <button
          onClick={() => choosePlan('SUBSCRIPTION')}
          disabled={saving}
          className={`text-left card p-6 transition-colors disabled:opacity-60 ${
            plan.billingPlan === 'SUBSCRIPTION' ? 'border-brand-500 ring-2 ring-brand-500/30' : ''
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-lg font-semibold text-surface-900">Flat subscription</h2>
            {plan.billingPlan === 'SUBSCRIPTION' && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-500/15 text-brand-300 border border-brand-500/30">
                Current plan
              </span>
            )}
          </div>
          <p className="text-surface-600 text-sm">
            Pay a flat ₹{plan.subscriptionFee.toLocaleString('en-IN')}/month, keep 100% of every
            booking. Makes sense once you have steady volume.
          </p>
        </button>
      </div>

      <div className="bg-surface-200/50 border border-surface-300 rounded-xl p-4 text-sm text-surface-600 mb-12">
        <p>
          <strong className="text-surface-900">Note:</strong> this sets which model applies to
          your account, and booking totals already reflect it. Commission is deducted when a
          payout batch is generated below — subscription fees are still settled directly with
          the StayEase team, since there&apos;s no recurring billing infra yet.
        </p>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl font-bold text-surface-900">Payouts</h2>
      </div>

      {payoutsLoading ? (
        <div className="card p-6 animate-pulse h-24 mb-8" />
      ) : (
        <div className="card p-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <p className="text-sm text-surface-500 mb-1">Available to settle</p>
              <p className="text-3xl font-bold text-brand-400">
                ₹{(balance?.netPayable ?? 0).toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-surface-500 mt-1">
                {balance?.eligibleBookingCount ?? 0} booking{balance?.eligibleBookingCount !== 1 ? 's' : ''}
                {balance && balance.platformFee > 0 && (
                  <> · after ₹{balance.platformFee.toLocaleString('en-IN')} platform fee</>
                )}
              </p>
            </div>
            <Button
              onClick={handleRequestPayout}
              disabled={requesting || !balance || balance.eligibleBookingCount === 0}
            >
              {requesting ? 'Requesting…' : 'Request payout'}
            </Button>
          </div>
          {payoutError && <p className="text-sm text-red-400 mt-3">{payoutError}</p>}
        </div>
      )}

      {payouts.length > 0 && (
        <div className="space-y-3">
          {payouts.map((p) => (
            <div key={p.id} className="card p-5 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-surface-900">
                  ₹{p.netPayable.toLocaleString('en-IN')} · {p.bookingCount} booking
                  {p.bookingCount !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-surface-500 mt-0.5">
                  {new Date(p.periodStart).toLocaleDateString()} → {new Date(p.periodEnd).toLocaleDateString()}
                  {p.paidAt && <> · paid {new Date(p.paidAt).toLocaleDateString()}</>}
                </p>
              </div>
              <Badge tone={p.status === 'PAID' ? 'success' : 'warning'}>{p.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
