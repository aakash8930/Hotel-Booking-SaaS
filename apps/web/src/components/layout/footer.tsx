import Link from 'next/link';

export function Footer() {
  return (
    <footer className="premium-footer">
      <div className="container-premium footer-top">
        <div>
          <Link href="/" className="premium-logo footer-logo" aria-label="StayEase home">
            <span className="logo-mark">S</span>
            <span>StayEase</span>
          </Link>
          <p>Independent stays. Directly yours.</p>
          <p className="footer-manifesto">For the quiet hotels, family homes and places worth taking the long way to.</p>
        </div>

        <div className="footer-links">
          <div>
            <span>Explore</span>
            <Link href="/search">Find a stay</Link>
            <Link href="/account/trips">My trips</Link>
            <Link href="/account/login">Guest sign in</Link>
          </div>
          <div>
            <span>Hosts</span>
            <Link href="/host/register">List your property</Link>
            <Link href="/host/properties">Host dashboard</Link>
            <Link href="/host/login">Host sign in</Link>
          </div>
          <div>
            <span>StayEase</span>
            <Link href="/legal/terms">Terms</Link>
            <Link href="/legal/privacy">Privacy</Link>
            <Link href="/legal/cancellation-refund">Cancellation & refunds</Link>
          </div>
        </div>
      </div>

      <div className="container-premium footer-bottom">
        <span>© {new Date().getFullYear()} StayEase</span>
        <span>Built for stays worth remembering.</span>
      </div>
    </footer>
  );
}
