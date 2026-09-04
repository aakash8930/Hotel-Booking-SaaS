'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type Status = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';

interface VerificationInfo {
  verificationStatus: Status;
  verificationNote: string | null;
  verifiedAt: string | null;
}

const ID_TYPES = [
  { value: 'AADHAAR', label: 'Aadhaar' },
  { value: 'PAN', label: 'PAN' },
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'DRIVING_LICENSE', label: 'Driving licence' },
];

function tone(status: Status): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'VERIFIED') return 'success';
  if (status === 'PENDING') return 'warning';
  if (status === 'REJECTED') return 'danger';
  return 'neutral';
}

export function VerificationCard() {
  const [info, setInfo] = useState<VerificationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [idType, setIdType] = useState('AADHAAR');
  const [idNumber, setIdNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await api.get<VerificationInfo>('/auth/host/verification');
    if (res.success && res.data) setInfo(res.data);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const res = await api.post<VerificationInfo>('/auth/host/verification', { idType, idNumber });
    if (res.success && res.data) {
      setInfo(res.data);
      setIdNumber('');
    } else {
      setError(res.error?.message || 'Could not submit verification');
    }
    setSubmitting(false);
  }

  if (loading) return <div className="card p-6 animate-pulse h-32" />;

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-semibold text-surface-900">Identity verification</h3>
        {info && <Badge tone={tone(info.verificationStatus)}>{info.verificationStatus}</Badge>}
      </div>
      <p className="text-surface-500 text-sm mb-4">
        Verified hosts get a trust badge on their listings. Submitted info is reviewed by our team
        — no ID number is stored in full, only a masked reference.
      </p>

      {info?.verificationNote && (
        <p className="text-surface-500 text-xs mb-4">On file: {info.verificationNote}</p>
      )}

      {info?.verificationStatus !== 'VERIFIED' && info?.verificationStatus !== 'PENDING' && (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <select value={idType} onChange={(e) => setIdType(e.target.value)} className="input text-sm w-auto">
            {ID_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            className="input text-sm flex-1"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            placeholder="ID number"
            required
            minLength={4}
          />
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit for review'}
          </Button>
        </form>
      )}

      {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
    </div>
  );
}
