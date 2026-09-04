'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useGuestSession } from '@/lib/guest-session';
import { useHostSession } from '@/lib/host-session';

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const { profile, isLoggedIn } = useGuestSession();
  const { isLoggedIn: isHostLoggedIn } = useHostSession();
  const hostCtaHref = isHostLoggedIn ? '/host/properties' : '/host/register';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass shadow-panel' : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="container-custom flex items-center justify-between h-16 md:h-20">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-300 to-brand-600 shadow-glow flex items-center justify-center text-surface-50 font-display font-bold text-sm">
            S
          </span>
          <span className="font-display text-xl font-semibold text-surface-900 tracking-tight">
            StayEase
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-surface-600">
          <Link href="/search" className="hover:text-surface-900 transition-colors">
            Explore stays
          </Link>
          <Link href={hostCtaHref} className="hover:text-surface-900 transition-colors">
            List your property
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Button href="/search" variant="ghost" size="sm" className="hidden sm:inline-flex">
            Explore
          </Button>
          {isLoggedIn ? (
            <Button href="/account/trips" variant="secondary" size="sm">
              {profile?.name.split(' ')[0] ?? 'My trips'}
            </Button>
          ) : (
            <Button href="/account/login" variant="secondary" size="sm" className="hidden sm:inline-flex">
              Sign in
            </Button>
          )}
          <Button href={hostCtaHref} variant="primary" size="sm">
            List your property
          </Button>
        </div>
      </div>
    </header>
  );
}
