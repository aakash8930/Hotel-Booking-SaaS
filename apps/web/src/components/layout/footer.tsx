import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-surface-200 bg-white">
      <div className="container-custom py-10 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-surface-500">
        <p>© {new Date().getFullYear()} StayEase. Independent hotels &amp; homestays, booked directly.</p>
        <div className="flex gap-6">
          <Link href="/legal/terms" className="hover:text-surface-700 hover:underline">
            Terms
          </Link>
          <Link href="/legal/privacy" className="hover:text-surface-700 hover:underline">
            Privacy
          </Link>
          <Link href="/legal/cancellation-refund" className="hover:text-surface-700 hover:underline">
            Cancellation &amp; Refunds
          </Link>
        </div>
      </div>
    </footer>
  );
}
