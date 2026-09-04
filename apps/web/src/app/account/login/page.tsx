'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { guestApi } from '@/lib/api';
import { setGuestProfile, type GuestProfile } from '@/lib/guest-session';
import { Button } from '@/components/ui/button';
import { Input, FieldLabel } from '@/components/ui/input';

interface GuestAuthResponse {
  accessToken: string;
  refreshToken: string;
  guest: GuestProfile;
}

export default function GuestLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <GuestLoginForm />
    </Suspense>
  );
}

function GuestLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await guestApi.post<GuestAuthResponse>('/auth/guest/login', { email, password });

    if (res.success && res.data) {
      guestApi.setTokens(res.data);
      setGuestProfile(res.data.guest);
      router.push(searchParams.get('next') || '/account/trips');
    } else {
      setError(res.error?.message || 'Invalid email or password');
      setLoading(false);
    }
  }

  return (
    <div className="container-custom pt-28 pb-16 md:pt-32 max-w-md">
      <h1 className="font-display text-3xl font-bold mb-2 text-surface-900">Sign in</h1>
      <p className="text-surface-500 mb-8">Access your trips and bookings.</p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 md:p-8 space-y-5">
        <div>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="text-sm text-surface-500 mt-6 text-center">
        New here?{' '}
        <Link href="/account/register" className="text-brand-300 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
