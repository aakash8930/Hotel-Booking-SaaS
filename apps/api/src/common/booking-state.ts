/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Booking State Machine
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The SINGLE source of truth for booking status transitions.
 * Every status change in the entire codebase MUST go through `transition()`.
 *
 * Valid transitions:
 *
 *   PENDING ──────► CONFIRMED ──────► PAID ──────► CHECKED_IN ──────► CHECKED_OUT
 *      │                │                │               │
 *      │                │                │               │
 *      ▼                ▼                ▼               ▼
 *   CANCELLED ◄──── CANCELLED ◄──── CANCELLED ◄──── CANCELLED
 *      ▲
 *      │
 *   EXPIRED  (hold timer ran out — only from PENDING)
 *
 *   PENDING → EXPIRED  (automated, hold_expires_at passed)
 *
 * Any other transition (e.g. PENDING → CHECKED_IN skipping payment)
 * is INVALID and will throw.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { BookingStatus } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

// ── Transition Map ───────────────────────────────────────────────────────────
// Keys are source states, values are the set of valid target states.

const TRANSITIONS: Record<BookingStatus, ReadonlySet<BookingStatus>> = {
  [BookingStatus.PENDING]: new Set([
    BookingStatus.CONFIRMED,  // Payment initiated
    BookingStatus.CANCELLED,  // User cancels or admin cancels
    BookingStatus.EXPIRED,    // Hold timer ran out (automated)
  ]),
  [BookingStatus.CONFIRMED]: new Set([
    BookingStatus.PAID,       // Payment verified (webhook)
    BookingStatus.CANCELLED,  // Payment failed or admin cancels
  ]),
  [BookingStatus.PAID]: new Set([
    BookingStatus.CHECKED_IN, // Guest arrives
    BookingStatus.CANCELLED,  // Admin cancels (refund flow)
  ]),
  [BookingStatus.CHECKED_IN]: new Set([
    BookingStatus.CHECKED_OUT, // Guest departs (this is "COMPLETED")
    BookingStatus.CANCELLED,   // Admin cancels (edge case)
  ]),
  [BookingStatus.CHECKED_OUT]: new Set<BookingStatus>([]),  // Terminal state
  [BookingStatus.CANCELLED]: new Set<BookingStatus>([]),     // Terminal state
  [BookingStatus.EXPIRED]: new Set<BookingStatus>([]),       // Terminal state
};

/**
 * Check whether a transition from `from` to `to` is valid.
 * Pure function — no side effects.
 */
export function canTransition(
  from: BookingStatus,
  to: BookingStatus,
): boolean {
  const allowed = TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.has(to);
}

/**
 * Assert that a transition is valid. Throws BadRequestException if not.
 * Use this BEFORE performing the database update.
 */
export function assertCanTransition(
  from: BookingStatus,
  to: BookingStatus,
): void {
  if (!canTransition(from, to)) {
    throw new BadRequestException(
      `Invalid booking state transition: ${from} → ${to}. ` +
      `Valid transitions from ${from}: ${[...TRANSITIONS[from]].join(', ') || 'none (terminal state)'}`,
    );
  }
}

/**
 * Get all valid target states for a given source state.
 */
export function getValidTransitions(from: BookingStatus): BookingStatus[] {
  return [...(TRANSITIONS[from] ?? [])];
}

/**
 * Check if a status is a terminal state (no further transitions possible).
 */
export function isTerminal(status: BookingStatus): boolean {
  return (TRANSITIONS[status]?.size ?? 0) === 0;
}

/**
 * All active states — bookings in these states "hold" the room dates
 * and are subject to the EXCLUDE constraint.
 */
export const ACTIVE_STATES: ReadonlySet<BookingStatus> = new Set([
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.PAID,
  BookingStatus.CHECKED_IN,
]);

/**
 * Check if a status is "active" (holding the room).
 */
export function isActive(status: BookingStatus): boolean {
  return ACTIVE_STATES.has(status);
}
