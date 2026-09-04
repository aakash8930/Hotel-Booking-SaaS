/**
 * Server/edge-runtime Sentry init for the Next.js app. Mirrors the
 * backend's graceful-degradation pattern: no DSN, no init, no crash.
 */
import * as Sentry from '@sentry/nextjs';

export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (!dsn) {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      console.warn(
        '[Sentry] NEXT_PUBLIC_SENTRY_DSN not configured — server-side errors will not be tracked.',
      );
    }
    return;
  }

  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({ dsn, tracesSampleRate: 1.0 });
  }
}

export const onRequestError = Sentry.captureRequestError;
