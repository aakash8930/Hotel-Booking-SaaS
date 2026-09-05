import Link from 'next/link';

export function Footer() {
  return (
    <footer className="premium-footer">
      <div className="container-premium footer-top">
        <div>
          <Link href="/" className="premium-logo footer-logo"><span className="logo-mark">S</span><span>StayEase</span></Link>
          <p>Independent stays. Directly yours.</p>
        </div>
        <div className="footer-links">
          <div><span>Explore</span><Link href="/search">Find a stay</Link><Link href="/account/trips">My trips</Link></div>
          <div><span>Hosts</span><Link href="/host/register">List your property</Link><Link href="/host/properties">Host dashboard</Link></div>
          <div><span>Legal</span><Link href="/legal/terms">Terms</Link><Link href="/legal/privacy">Privacy</Link></div>
        </div>
      </div>
      <div className="container-premium footer-bottom">
        <span>© {new Date().getFullYear()} StayEase</span>
        <span>Made for the places worth finding.</span>
      </div>
    </footer>
  );
}
