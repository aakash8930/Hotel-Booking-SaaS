'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

export function GstinCard() {
  const [gstin, setGstin] = useState('');
  const [saved, setSaved] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ gstin: string | null }>('/host/billing').then((res) => {
      if (res.success && res.data) {
        setSaved(res.data.gstin);
        setGstin(res.data.gstin || '');
      }
      setLoading(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const res = await api.put<{ gstin: string | null }>('/host/billing/gstin', {
      gstin: gstin.trim() || null,
    });
    if (res.success && res.data) {
      setSaved(res.data.gstin);
    } else {
      setError(res.error?.message || 'Could not save GSTIN');
    }
    setSaving(false);
  }

  if (loading) return <div className="card p-6 animate-pulse h-24" />;

  return (
    <div className="card p-6">
      <h3 className="font-semibold text-surface-900 mb-1">GST registration</h3>
      <p className="text-surface-500 text-sm mb-4">
        Add your GSTIN to issue registered tax invoices with CGST/SGST or IGST. Optional — GST
        registration is threshold-based; without one, invoices are issued as an unregistered
        supplier.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          className="input text-sm flex-1 uppercase"
          value={gstin}
          onChange={(e) => setGstin(e.target.value.toUpperCase())}
          placeholder="22AAAAA0000A1Z5"
          maxLength={15}
        />
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </form>
      {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
      {saved && !error && <p className="text-xs text-surface-500 mt-2">On file: {saved}</p>}
    </div>
  );
}
