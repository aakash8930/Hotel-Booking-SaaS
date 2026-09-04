/**
 * Client-side (browser) Sentry init. Auto-loaded by Next.js when this
 * file exists at src/instrumentation-client.ts. Same graceful
 * degradation as the server side — no DSN, no tracking, no crash.
 */
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({ dsn, tracesSampleRate: 1.0 });
} else if (typeof window !== 'undefined') {
  console.warn(
    '[Sentry] NEXT_PUBLIC_SENTRY_DSN not configured — client-side errors will not be tracked.',
  );
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
