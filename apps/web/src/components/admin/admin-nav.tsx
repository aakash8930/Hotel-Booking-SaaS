'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAdminSession, clearAdminSession } from '@/lib/admin-session';
import { Button } from '@/components/ui/button';

const LINKS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/hosts', label: 'Hosts' },
  { href: '/admin/properties', label: 'Properties' },
  { href: '/admin/reviews', label: 'Reviews' },
  { href: '/admin/bookings', label: 'Bookings' },
  { href: '/admin/payouts', label: 'Payouts' },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAdminSession();

  function handleSignOut() {
    clearAdminSession();
    router.push('/admin/login');
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-surface-200">
      <nav className="flex flex-wrap gap-2">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              pathname === link.href
                ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30'
                : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-3">
        {profile && <span className="text-sm text-surface-500">{profile.name}</span>}
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
