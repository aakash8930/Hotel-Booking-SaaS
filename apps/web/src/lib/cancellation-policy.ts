import type { CancellationPolicy } from '@hbs/shared';

export const CANCELLATION_POLICY_LABELS: Record<CancellationPolicy, string> = {
  FLEXIBLE: 'Flexible',
  MODERATE: 'Moderate',
  STRICT: 'Strict',
};

/** Mirrors apps/api/src/common/cancellation-policy.ts CANCELLATION_POLICY_DESCRIPTIONS — keep in sync. */
export const CANCELLATION_POLICY_DESCRIPTIONS: Record<CancellationPolicy, string> = {
  FLEXIBLE: 'Full refund if cancelled at least 24 hours before check-in.',
  MODERATE:
    'Full refund if cancelled 5+ days before check-in. 50% refund if cancelled 1-5 days before. No refund within 24 hours.',
  STRICT:
    '50% refund if cancelled at least 7 days before check-in. No refund within 7 days of check-in.',
};
