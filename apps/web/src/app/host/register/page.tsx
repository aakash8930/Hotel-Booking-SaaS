'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { setHostProfile } from '@/lib/host-session';
import { Button } from '@/components/ui/button';
import { Input, FieldLabel } from '@/components/ui/input';
import type { AuthResponse } from '@hbs/shared';

export default function HostRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', businessName: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await api.post<AuthResponse>('/auth/register', {
      name: form.name,
      businessName: form.businessName || undefined,
      email: form.email,
      phone: form.phone || undefined,
      password: form.password,
    });

    if (res.success && res.data) {
      api.setTokens(res.data);
      setHostProfile(res.data.host);
      router.push('/host/properties');
    } else {
      setError(res.error?.message || 'Could not create your host account');
      setLoading(false);
    }
  }

  return (
    <div className="container-custom pt-28 pb-16 md:pt-32 max-w-md">
      <h1 className="font-display text-3xl font-bold mb-2 text-surface-900">List your property</h1>
      <p className="text-surface-500 mb-8">Create a host account to start managing bookings.</p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 md:p-8 space-y-5">
        <div>
          <FieldLabel htmlFor="name">Your name</FieldLabel>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <FieldLabel htmlFor="businessName">Business name (optional)</FieldLabel>
          <Input
            id="businessName"
            value={form.businessName}
            onChange={(e) => setForm({ ...form, businessName: e.target.value })}
            placeholder="Mountain View Homestays"
          />
        </div>
        <div>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div>
          <FieldLabel htmlFor="phone">Phone (optional)</FieldLabel>
          <Input
            id="phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+919876543210"
          />
        </div>
        <div>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            minLength={8}
            required
          />
          <p className="text-xs text-surface-500 mt-1.5">
            At least 8 characters, with an uppercase letter, lowercase letter, and a number.
          </p>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creating account…' : 'Create host account'}
        </Button>
      </form>

      <p className="text-sm text-surface-500 mt-6 text-center">
        Already have a host account?{' '}
        <Link href="/host/login" className="text-brand-300 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
