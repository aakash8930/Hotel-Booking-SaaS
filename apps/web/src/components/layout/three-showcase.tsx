'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';

// WebGL only exists in the browser, and there's no reason to ship the
// three.js bundle to anyone who never scrolls this far — load on demand.
const Scene3D = dynamic(() => import('./scene-3d').then((m) => m.Scene3D), {
  ssr: false,
  loading: () => null,
});

export function ThreeShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldMount, setShouldMount] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldMount(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={containerRef} className="section bg-surface-900 overflow-hidden">
      <div className="container-custom grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-brand-400 text-sm tracking-[0.2em] uppercase mb-4">
            Built on a hard guarantee
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6">
            Structurally impossible to double-book
          </h2>
          <p className="text-lg text-white/60 leading-relaxed max-w-lg">
            Every reservation is enforced at the database level — not just
            checked by application code. Two guests can hammer the same
            dates at the same instant; the database itself guarantees only
            one reservation survives.
          </p>
        </motion.div>

        <div className="relative h-80 md:h-[28rem]">
          {shouldMount && !reducedMotion ? (
            <Scene3D />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-40 h-40 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 opacity-80" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
