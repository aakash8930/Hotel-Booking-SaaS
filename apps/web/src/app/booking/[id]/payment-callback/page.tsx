'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface VerifyResponse {
  paymentId: string;
  status: string;
  bookingStatus: string;
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen premium-callback-page" />}>
      <PaymentCallback />
    </Suspense>
  );
}

function PaymentCallback() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = params.id as string;
  const paymentId = searchParams.get('paymentId');

  const [status, setStatus] = useState<'checking' | 'success' | 'failed' | 'error'>('checking');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!paymentId) {
      setStatus('error');
      setMessage('Missing payment reference.');
      return;
    }
    verify(paymentId);
  }, [paymentId]);

  async function verify(id: string) {
    const res = await api.get<VerifyResponse>(`/payments/verify/${id}`);

    if (res.success && res.data) {
      if (res.data.bookingStatus === 'PAID') {
        setStatus('success');
      } else if (res.data.status === 'FAILED') {
        setStatus('failed');
      } else {
        setStatus('failed');
        setMessage('Payment did not complete. You can try again.');
      }
    } else {
      setStatus('error');
      setMessage(res.error?.message || 'Could not verify payment.');
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {status === 'checking' && (
          <>
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-surface-600">Confirming your payment…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/15 border border-emerald-500/30 rounded-full mb-4">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-surface-900 mb-2">Payment successful</h1>
            <p className="text-surface-500 mb-6">Your booking is confirmed and paid.</p>
            <Button onClick={() => router.push(`/booking/${bookingId}/confirm`)}>
              View booking
            </Button>
          </>
        )}

        {(status === 'failed' || status === 'error') && (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/15 border border-red-500/30 rounded-full mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-surface-900 mb-2">Payment not completed</h1>
            <p className="text-surface-500 mb-6">{message || 'Something went wrong.'}</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => router.push(`/booking/${bookingId}/confirm`)}>
                Try again
              </Button>
              <Button variant="secondary" onClick={() => router.push('/')}>
                Back to home
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
