'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  CANCELLATION_POLICY_LABELS,
  CANCELLATION_POLICY_DESCRIPTIONS,
} from '@/lib/cancellation-policy';
import { RequireHost } from '@/components/host/require-host';
import type { CancellationPolicy } from '@hbs/shared';

export default function NewPropertyPage() {
  return (
    <RequireHost>
      <NewPropertyForm />
    </RequireHost>
  );
}

function NewPropertyForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    state: 'Himachal Pradesh',
    pincode: '',
    checkInTime: '14:00',
    checkOutTime: '11:00',
    status: 'ACTIVE',
    cancellationPolicy: 'MODERATE' as CancellationPolicy,
  });

  const [notes, setNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState('');

  async function handleGenerateDescription() {
    if (!notes.trim()) return;
    setGenerating(true);
    setAiError('');

    const res = await api.post<{ description: string }>('/ai/property-description', {
      notes,
      propertyName: form.name || undefined,
      city: form.city || undefined,
    });

    if (res.success && res.data) {
      const { description } = res.data;
      setForm((f) => ({ ...f, description }));
    } else {
      setAiError(res.error?.message || 'Could not generate a description.');
    }
    setGenerating(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await api.post('/host/properties', form);

    if (res.success) {
      router.push('/host/properties');
    } else {
      setError(res.error?.message || 'Failed to create property');
      setLoading(false);
    }
  }

  return (
    <div className="container-custom pt-28 pb-16 md:pt-32 max-w-2xl">
      <h1 className="font-display text-3xl md:text-4xl font-bold mb-8 text-surface-900">Add new property</h1>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 md:p-8 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Property Name</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Mountain View Homestay"
            required
          />
        </div>

        <div className="bg-brand-500/5 border border-brand-500/20 rounded-xl p-4">
          <label className="block text-sm font-medium mb-2 text-surface-800">
            Rough notes <span className="text-surface-500 font-normal">(optional)</span>
          </label>
          <p className="text-xs text-surface-500 mb-2">
            Jot down a few bullet points — views, vibe, what makes the place special — and
            generate a polished description from them.
          </p>
          <textarea
            className="input min-h-[70px] mb-2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="mountain views, home-cooked breakfast, quiet, family-run, 10 min from the temple..."
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleGenerateDescription}
            disabled={!notes.trim() || generating}
          >
            ✨ {generating ? 'Generating…' : 'Generate description with AI'}
          </Button>
          {aiError && <p className="text-sm text-red-400 mt-2">{aiError}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            className="input min-h-[100px]"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="A cozy homestay with stunning mountain views..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Address</label>
          <input
            className="input"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Village Dhungri, Near Hadimba Temple"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">City</label>
            <input
              className="input"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="Manali"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">State</label>
            <select
              className="input"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
            >
              <option>Himachal Pradesh</option>
              <option>Uttarakhand</option>
              <option>Goa</option>
              <option>Kerala</option>
              <option>Rajasthan</option>
              <option>Karnataka</option>
              <option>Tamil Nadu</option>
              <option>West Bengal</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Pincode</label>
          <input
            className="input"
            value={form.pincode}
            onChange={(e) => setForm({ ...form, pincode: e.target.value })}
            placeholder="175131"
            pattern="\d{6}"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Check-in Time</label>
            <input
              type="time"
              className="input"
              value={form.checkInTime}
              onChange={(e) => setForm({ ...form, checkInTime: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Check-out Time</label>
            <input
              type="time"
              className="input"
              value={form.checkOutTime}
              onChange={(e) => setForm({ ...form, checkOutTime: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Cancellation policy</label>
          <div className="grid gap-3">
            {(Object.keys(CANCELLATION_POLICY_LABELS) as CancellationPolicy[]).map((policy) => (
              <label
                key={policy}
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                  form.cancellationPolicy === policy
                    ? 'border-brand-500 ring-2 ring-brand-500/30 bg-brand-500/5'
                    : 'border-surface-300 hover:border-surface-400'
                }`}
              >
                <input
                  type="radio"
                  name="cancellationPolicy"
                  className="mt-1 accent-brand-500"
                  checked={form.cancellationPolicy === policy}
                  onChange={() => setForm({ ...form, cancellationPolicy: policy })}
                />
                <div>
                  <p className="font-medium text-surface-900 text-sm">
                    {CANCELLATION_POLICY_LABELS[policy]}
                  </p>
                  <p className="text-surface-500 text-xs mt-0.5">
                    {CANCELLATION_POLICY_DESCRIPTIONS[policy]}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating…' : 'Create property'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
