'use client';

import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import { MotionConfig } from 'framer-motion';

/**
 * Smooth scroll wrapper using Lenis.
 * Integrates with GSAP ScrollTrigger for scroll-scrubbed animations.
 *
 * Also wraps the app in MotionConfig(reducedMotion="user") so every
 * Framer Motion animation site-wide automatically respects the OS-level
 * prefers-reduced-motion setting without each component opting in
 * individually.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // Inertia-based smooth scroll is exactly the kind of motion
    // prefers-reduced-motion exists to suppress — skip it entirely for
    // those users rather than just softening it.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 2,
    });

    lenisRef.current = lenis;

    // Integration with GSAP ScrollTrigger
    import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
      lenis.on('scroll', ScrollTrigger.update);
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
