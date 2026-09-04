/**
 * Sentry error tracking — initialized once at bootstrap, guarded by
 * SENTRY_DSN like every other optional integration in this project
 * (PhonePe, Resend, Gemini): without a DSN, this logs a warning and
 * every Sentry.* call downstream becomes a safe no-op.
 */

import { Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';

const logger = new Logger('Sentry');

export function initSentry(dsn: string | undefined, environment: string): void {
  if (!dsn) {
    logger.warn(
      'SENTRY_DSN not configured — errors will only be logged locally, not tracked. ' +
        'Set SENTRY_DSN in .env to enable (free tier at sentry.io).',
    );
    return;
  }

  Sentry.init({
    dsn,
    environment,
    // Pilot-stage traffic is tiny — capture every transaction rather than
    // sampling, so there's nothing to miss while volume is low.
    tracesSampleRate: 1.0,
  });

  logger.log('Sentry error tracking enabled');
}
