import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import { SmoothScroll } from '@/components/animations/smooth-scroll';
import { Footer } from '@/components/layout/footer';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'StayEase — Book Homestays & Independent Hotels',
    template: '%s | StayEase',
  },
  description:
    'Discover and book unique homestays and independent hotels across India. Live availability, instant UPI booking, and seamless check-in.',
  keywords: [
    'homestay booking',
    'independent hotels India',
    'UPI hotel booking',
    'Manali homestay',
    'Goa homestay',
    'boutique hotel',
  ],
  authors: [{ name: 'StayEase' }],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'StayEase',
    title: 'StayEase — Book Homestays & Independent Hotels',
    description:
      'Discover and book unique homestays and independent hotels across India.',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans flex flex-col min-h-screen">
        <SmoothScroll>
          <div className="flex-1">{children}</div>
          <Footer />
        </SmoothScroll>
      </body>
    </html>
  );
}
