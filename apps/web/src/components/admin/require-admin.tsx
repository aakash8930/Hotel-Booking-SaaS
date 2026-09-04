'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAdminSession } from '@/lib/admin-session';

/** Wraps admin-only pages: redirects to /admin/login if no admin session is present. */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoggedIn, ready } = useAdminSession();

  useEffect(() => {
    if (ready && !isLoggedIn) {
      router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
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
