'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGuestSession } from '@/lib/guest-session';
import { useHostSession } from '@/lib/host-session';

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { profile, isLoggedIn } = useGuestSession();
  const { isLoggedIn: isHostLoggedIn } = useHostSession();
  const hostCtaHref = isHostLoggedIn ? '/host/properties' : '/host/register';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <header className={`premium-header ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="premium-nav">
          <Link href="/" className="premium-logo" aria-label="StayEase home">
            <span className="logo-mark">S</span>
            <span>StayEase</span>
          </Link>

          <nav className="premium-nav-links" aria-label="Primary navigation">
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
            <button
              type="button"
              className="nav-menu-button"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      <div className={`premium-mobile-menu ${menuOpen ? 'is-open' : ''}`}>
        <nav aria-label="Mobile navigation">
          <Link href="/search"><span>01</span>Explore stays</Link>
          <Link href="/account/trips"><span>02</span>{isLoggedIn ? 'My trips' : 'Guest account'}</Link>
          <Link href={hostCtaHref}><span>03</span>{isHostLoggedIn ? 'Host dashboard' : 'List your property'}</Link>
          {!isLoggedIn && <Link href="/account/login"><span>04</span>Sign in</Link>}
        </nav>
        <p>Independent stays. Directly yours.</p>
      </div>
    </>
  );
}
