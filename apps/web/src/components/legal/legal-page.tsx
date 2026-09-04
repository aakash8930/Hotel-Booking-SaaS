import Link from 'next/link';

export function LegalPage({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="container-custom max-w-3xl py-16">
      <div className="mb-10">
        <h1 className="font-display text-4xl font-bold text-surface-900 mb-2">{title}</h1>
        <p className="text-sm text-surface-500">Last updated: {lastUpdated}</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-10 text-sm text-amber-800">
        <strong>Template notice:</strong> This is a starting-point document adapted to how
        StayEase actually works, not a substitute for legal advice. Have it reviewed by a
        qualified lawyer before relying on it for real bookings and real money.
      </div>

      <div className="space-y-8 text-surface-700 leading-relaxed [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-surface-900 [&_h2]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_li]:text-surface-700 [&_strong]:text-surface-900">
        {children}
      </div>

      <div className="mt-16 pt-8 border-t border-surface-200 flex gap-6 text-sm text-surface-500">
        <Link href="/legal/terms" className="hover:text-surface-700 hover:underline">
          Terms of Service
        </Link>
        <Link href="/legal/privacy" className="hover:text-surface-700 hover:underline">
          Privacy Policy
        </Link>
        <Link href="/legal/cancellation-refund" className="hover:text-surface-700 hover:underline">
          Cancellation &amp; Refunds
        </Link>
      </div>
    </div>
  );
}
