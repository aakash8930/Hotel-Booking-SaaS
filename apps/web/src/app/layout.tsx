import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import { SmoothScroll } from '@/components/animations/smooth-scroll';
import { Header } from '@/components/layout/header';
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
    default: 'StayEase — Independent stays, worth remembering.',
    template: '%s | StayEase',
  },
  description:
    'Discover independent hotels, homestays and quiet retreats across India. Live availability, direct booking and UPI checkout.',
  keywords: [
    'homestay booking',
    'independent hotels India',
    'UPI hotel booking',
    'boutique hotels',
    'luxury homestays',
    'India stays',
  ],
  authors: [{ name: 'StayEase' }],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'StayEase',
    title: 'StayEase — Independent stays, worth remembering.',
    description:
      'Handpicked homestays, boutique hotels and quiet retreats across India.',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export const viewport = {
  themeColor: '#0a0908',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} dark`}>
      <body className="font-sans flex flex-col min-h-screen">
        <SmoothScroll>
          <Header />
          <div className="flex-1">{children}</div>
          <Footer />
        </SmoothScroll>
      </body>
    </html>
  );
}
