'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

/**
 * Animated hero section with GSAP scroll-scrub potential.
 * This is the "Apple product page" style hero that sets the premium tone.
 */
export function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // GSAP animation setup — will be expanded with scroll-scrubbed effects
    let ctx: gsap.Context | undefined;

    import('gsap').then(({ gsap }) => {
      ctx = gsap.context(() => {
        gsap.from('.hero-title', {
          y: 60,
          opacity: 0,
          duration: 1,
          ease: 'power3.out',
        });

        gsap.from('.hero-subtitle', {
          y: 40,
          opacity: 0,
          duration: 1,
          delay: 0.2,
          ease: 'power3.out',
        });

        gsap.from('.hero-cta', {
          y: 30,
          opacity: 0,
          duration: 1,
          delay: 0.4,
          ease: 'power3.out',
        });
      }, heroRef);
    });

    return () => ctx?.revert();
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-surface-50 to-brand-100" />

      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-brand-200/30 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-brand-300/20 rounded-full blur-3xl" />

      {/* Content */}
      <div className="relative z-10 container-custom text-center max-w-4xl mx-auto px-4">
        <motion.h1
          className="hero-title font-display text-5xl md:text-6xl lg:text-7xl font-bold text-surface-900 mb-6 text-balance"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Stay somewhere{' '}
          <span className="text-gradient">truly local</span>
        </motion.h1>

        <p className="hero-subtitle text-xl md:text-2xl text-surface-600 mb-10 max-w-2xl mx-auto">
          Discover handpicked homestays and independent hotels across India. 
          Book instantly with UPI — no middlemen, no hidden fees.
        </p>

        <div className="hero-cta flex flex-col sm:flex-row gap-4 justify-center items-center">
          <a href="#search" className="btn-primary text-lg px-8 py-4">
            Find your stay
          </a>
          <a href="/host/properties" className="btn-secondary text-lg px-8 py-4">
            List your property
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg
          className="w-6 h-6 text-surface-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>
    </section>
  );
}
