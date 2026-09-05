'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useGuestSession } from '@/lib/guest-session';
import { useHostSession } from '@/lib/host-session';

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const { profile, isLoggedIn } = useGuestSession();
  const { isLoggedIn: isHostLoggedIn } = useHostSession();
  const hostCtaHref = isHostLoggedIn ? '/host/properties' : '/host/register';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`premium-header ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="premium-nav">
        <Link href="/" className="premium-logo" aria-label="StayEase home">
          <span className="logo-mark">S</span>
          <span>StayEase</span>
        </Link>

        <nav className="premium-nav-links">
          <Link href="/search">Explore stays</Link>
          <Link href={hostCtaHref}>List your property</Link>
        </nav>

        <div className="premium-nav-actions">
          <Link href="/search" className="nav-explore">Explore</Link>
          {isLoggedIn ? (
            <Link href="/account/trips" className="nav-signin">{profile?.name?.split(' ')[0] ?? 'My trips'}</Link>
          ) : (
            <Link href="/account/login" className="nav-signin">Sign in</Link>
          )}
          <Link href={hostCtaHref} className="nav-host">List your property</Link>
        </div>
      </div>
    </header>
  );
}
