'use client';

import { useEffect, useRef } from 'react';

/**
 * Scroll-scrubbed storytelling section — the "Apple product page" style
 * pinned scene sequence called for in the premium UI/UX pass.
 *
 * There's no real property photography or video footage for this project
 * (zero-budget solo build, seed data only), so the "frames" here are
 * layered, art-directed SVG scenes rather than a literal video scrub.
 * Three destinations crossfade and parallax as the user scrolls through
 * one pinned viewport, exactly the mechanism a video-frame hero would use —
 * just driven by vector layers instead of decoded video frames.
 */

const scenes = [
  {
    key: 'mountains',
    place: 'Manali',
    region: 'Himachal Pradesh',
    line: 'Wake up to snow-capped ridgelines and woodsmoke.',
  },
  {
    key: 'coast',
    place: 'Goa',
    region: 'The Konkan coast',
    line: 'Fall asleep to the tide, steps from a family kitchen.',
  },
  {
    key: 'heritage',
    place: 'Jaipur',
    region: 'Rajasthan',
    line: 'Stay inside centuries of sandstone and story.',
  },
] as const;

export function JourneyStory() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const sceneRefs = useRef<(HTMLDivElement | null)[]>([]);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (prefersReducedMotion || !sectionRef.current) return;

    let st: { kill: () => void } | undefined;

    Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(
      ([{ gsap }, { ScrollTrigger }]) => {
        gsap.registerPlugin(ScrollTrigger);

        const scenesEls = sceneRefs.current.filter(Boolean) as HTMLDivElement[];
        if (scenesEls.length === 0 || !sectionRef.current) return;

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.6,
            pin: sectionRef.current.querySelector('.journey-viewport'),
            onUpdate: (self) => {
              if (progressRef.current) {
                progressRef.current.style.transform = `scaleX(${self.progress})`;
              }
            },
          },
        });

        st = tl.scrollTrigger;

        scenesEls.forEach((scene, i) => {
          const bg = scene.querySelector('.scene-bg');
          const caption = scene.querySelector('.scene-caption');

          const prevScene = scenesEls[i - 1];
          if (i > 0 && prevScene) {
            tl.to(
              prevScene,
              { autoAlpha: 0, duration: 1 },
              `scene${i}`,
            );
          }
          tl.fromTo(
            scene,
            { autoAlpha: i === 0 ? 1 : 0 },
            { autoAlpha: 1, duration: 1 },
            i === 0 ? 0 : `scene${i}`,
          );
          tl.fromTo(
            bg,
            { yPercent: 8 },
            { yPercent: -8, duration: 2, ease: 'none' },
            i === 0 ? 0 : `scene${i}`,
          );
          tl.fromTo(
            caption,
            { y: 24, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.8 },
            i === 0 ? 0.1 : `scene${i}+=0.1`,
          );
        });
      },
    );

    return () => {
      st?.kill();
    };
  }, []);

  return (
    <section ref={sectionRef} className="relative" style={{ height: '300vh' }}>
      <div className="journey-viewport relative h-screen w-full overflow-hidden bg-surface-50">
        {scenes.map((scene, i) => (
          <div
            key={scene.key}
            ref={(el) => {
              sceneRefs.current[i] = el;
            }}
            className="absolute inset-0"
            style={{ visibility: i === 0 ? 'visible' : 'hidden', opacity: i === 0 ? 1 : 0 }}
          >
            <div className="scene-bg absolute inset-0">
              <SceneArt kind={scene.key} />
            </div>

            <div className="scene-caption absolute inset-x-0 bottom-20 md:bottom-28 text-center px-4">
              <p className="text-brand-300 text-sm md:text-base tracking-[0.2em] uppercase mb-2">
                {scene.region}
              </p>
              <h3 className="font-display text-5xl md:text-7xl font-bold text-white mb-3">
                {scene.place}
              </h3>
              <p className="text-white/70 text-lg max-w-md mx-auto">{scene.line}</p>
            </div>
          </div>
        ))}

        {/* Scroll progress indicator */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 z-10">
          <div
            ref={progressRef}
            className="h-full bg-brand-400 origin-left"
            style={{ transform: 'scaleX(0)' }}
          />
        </div>

        {/* Scene dots */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {scenes.map((scene) => (
            <div key={scene.key} className="w-1.5 h-1.5 rounded-full bg-white/40" />
          ))}
        </div>
      </div>
    </section>
  );
}

function SceneArt({ kind }: { kind: (typeof scenes)[number]['key'] }) {
  if (kind === 'mountains') {
    return (
      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMax slice"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="sky-mountains" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b1a0c" />
            <stop offset="55%" stopColor="#86411e" />
            <stop offset="100%" stopColor="#e09a4a" />
          </linearGradient>
        </defs>
        <rect width="1440" height="900" fill="url(#sky-mountains)" />
        <circle cx="1080" cy="260" r="90" fill="#fdf8f0" opacity="0.9" />
        <polygon points="0,900 0,560 260,320 520,600 720,260 980,620 1180,400 1440,640 1440,900" fill="#57534e" opacity="0.55" />
        <polygon points="0,900 0,700 220,480 460,720 760,440 1040,740 1280,560 1440,760 1440,900" fill="#292524" opacity="0.8" />
        <polygon points="0,900 0,820 300,680 620,860 900,660 1180,860 1440,760 1440,900" fill="#1c1917" />
      </svg>
    );
  }

  if (kind === 'coast') {
    return (
      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMax slice"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="sky-coast" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1c1917" />
            <stop offset="45%" stopColor="#a7501d" />
            <stop offset="100%" stopColor="#f2d8b0" />
          </linearGradient>
        </defs>
        <rect width="1440" height="900" fill="url(#sky-coast)" />
        <circle cx="720" cy="520" r="110" fill="#f9edd9" opacity="0.85" />
        <path d="M0,620 Q180,560 360,620 T720,620 T1080,620 T1440,620 V900 H0 Z" fill="#44403c" opacity="0.55" />
        <path d="M0,700 Q180,650 360,700 T720,700 T1080,700 T1440,700 V900 H0 Z" fill="#292524" opacity="0.75" />
        <path d="M0,780 Q180,740 360,780 T720,780 T1080,780 T1440,780 V900 H0 Z" fill="#0c0a09" />
        <path d="M120,780 C120,700 90,660 40,650 C90,660 140,640 150,600 C160,650 210,660 240,650 C200,670 180,720 200,780 Z" fill="#0c0a09" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMax slice"
      className="w-full h-full"
    >
      <defs>
        <linearGradient id="sky-heritage" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b1a0c" />
          <stop offset="50%" stopColor="#6d371b" />
          <stop offset="100%" stopColor="#d8812a" />
        </linearGradient>
      </defs>
      <rect width="1440" height="900" fill="url(#sky-heritage)" />
      <circle cx="1160" cy="240" r="80" fill="#f9edd9" opacity="0.8" />
      <rect x="0" y="560" width="1440" height="340" fill="#292524" />
      {[120, 340, 560, 780, 1000, 1220].map((x) => (
        <g key={x}>
          <rect x={x} y={420} width="140" height="200" fill="#1c1917" />
          <path d={`M${x},420 Q${x + 70},340 ${x + 140},420 Z`} fill="#1c1917" />
        </g>
      ))}
      <rect x="560" y="640" width="320" height="260" fill="#0c0a09" />
      <path d="M560,640 Q720,500 880,640 Z" fill="#0c0a09" />
    </svg>
  );
}
