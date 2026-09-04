'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

type BillingPlan = 'COMMISSION' | 'SUBSCRIPTION';

interface BillingInfo {
  billingPlan: BillingPlan;
  commissionRate: number;
  subscriptionFee: number;
  billingPlanSetAt: string | null;
}

export default function HostBillingPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPlan();
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

  if (loading) return <div className="p-8">Loading...</div>;
  if (!plan) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <p className="text-red-600">{error || 'Could not load billing settings.'}</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <button onClick={() => router.back()} className="text-sm text-surface-500 mb-4 hover:underline">
        ← Back
      </button>
      <h1 className="text-3xl font-bold mb-2">Billing</h1>
      <p className="text-surface-500 mb-8">
        Choose how StayEase charges for using the platform.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 text-sm">
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
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-700">
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
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-700">
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

      <div className="bg-surface-50 border border-surface-200 rounded-lg p-4 text-sm text-surface-600">
        <p>
          <strong className="text-surface-900">Note:</strong> this sets which model applies to
          your account, and booking totals already reflect it. Automated collection (deducting
          commission at payout, or charging the subscription) isn&apos;t built yet — at pilot
          stage, billing is settled directly with the StayEase team.
        </p>
      </div>
    </div>
  );
}
