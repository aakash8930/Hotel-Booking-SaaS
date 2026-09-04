/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Cancellation Policy Engine
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Pure refund calculation — no I/O. `BookingsService.cancel()` calls this to
 * decide how much of a booking's total is refundable, then marks the most
 * recent successful payment as REFUNDED if the refund is non-zero.
 *
 * NOTE: this computes the refund amount but does not call PhonePe's refund
 * API to actually move money — automated payment collection/payout isn't
 * built yet either (see BillingService), so at pilot stage refunds are
 * settled manually using this number. Real refund-API integration belongs
 * with the rest of the payments hardening work.
 *
 *   FLEXIBLE  — full refund if cancelled >= 24h before check-in
 *   MODERATE  — full refund >= 5 days before check-in, 50% before that
 *   STRICT    — 50% refund >= 7 days before check-in, no refund after
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { CancellationPolicy } from '@hbs/prisma';

export interface RefundResult {
  refundPercent: number; // 0, 50, or 100
  refundAmount: number;
  hoursBeforeCheckIn: number;
}

const HOUR_MS = 60 * 60 * 1000;

export function calculateRefund(
  policy: CancellationPolicy,
  checkIn: Date,
  totalPrice: number,
  now: Date = new Date(),
): RefundResult {
  const hoursBeforeCheckIn = Math.max(0, (checkIn.getTime() - now.getTime()) / HOUR_MS);

  const refundPercent = (() => {
    switch (policy) {
      case 'FLEXIBLE':
        return hoursBeforeCheckIn >= 24 ? 100 : 0;
      case 'STRICT':
        return hoursBeforeCheckIn >= 24 * 7 ? 50 : 0;
      case 'MODERATE':
      default:
        return hoursBeforeCheckIn >= 24 * 5 ? 100 : hoursBeforeCheckIn >= 24 ? 50 : 0;
    }
  })();

  return {
    refundPercent,
    refundAmount: Math.round(totalPrice * (refundPercent / 100) * 100) / 100,
    hoursBeforeCheckIn: Math.round(hoursBeforeCheckIn),
  };
}

export const CANCELLATION_POLICY_DESCRIPTIONS: Record<CancellationPolicy, string> = {
  FLEXIBLE: 'Full refund if cancelled at least 24 hours before check-in.',
  MODERATE:
    'Full refund if cancelled 5+ days before check-in. 50% refund if cancelled 1-5 days before. No refund within 24 hours.',
  STRICT:
    '50% refund if cancelled at least 7 days before check-in. No refund within 7 days of check-in.',
};
