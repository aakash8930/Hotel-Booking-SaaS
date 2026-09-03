'use client';

import { useEffect, useRef } from 'react';
import Lenis from 'lenis';

/**
 * Smooth scroll wrapper using Lenis.
 * Integrates with GSAP ScrollTrigger for scroll-scrubbed animations.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 2,
    });

    lenisRef.current = lenis;

    // Integration with GSAP ScrollTrigger
    // @ts-expect-error - gsap is loaded dynamically
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

  return <>{children}</>;
}
