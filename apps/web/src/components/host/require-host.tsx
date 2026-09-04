'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useHostSession } from '@/lib/host-session';

/** Wraps host-only pages: redirects to /host/login if no host session is present. */
export function RequireHost({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoggedIn, ready } = useHostSession();

  useEffect(() => {
    if (ready && !isLoggedIn) {
      router.replace(`/host/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [ready, isLoggedIn, pathname, router]);

  if (!ready || !isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
