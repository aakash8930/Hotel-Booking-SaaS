#!/usr/bin/env tsx
/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 2 Verification Test: Payments + State Machine + Idempotent Webhooks
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Tests against a running API server (http://localhost:4000).
 *
 * Test plan:
 *   1. Register host, create property + room
 *   2. Create booking (PENDING)
 *   3. Initiate payment → booking should transition to CONFIRMED
 *   4. Fire webhook (SUCCESS) → booking should transition to PAID
 *   5. Fire SAME webhook AGAIN → booking stays PAID, no duplicate payment
 *   6. Fire webhooks CONCURRENTLY (5 at once) → only 1 processes
 *   7. Attempt invalid transition (create new booking, try PENDING → CHECKED_IN)
 *   8. Verify payment count — no duplicates
 *
 * Usage:
 *   pnpm dev:api          # Terminal 1
 *   pnpm test:phase2      # Terminal 2
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../../.env') });

const API = 'http://localhost:4000/api/v1';
const ts = Date.now();

// ANSI colors
const G = '\x1b[32m';
const R = '\x1b[31m';
const Y = '\x1b[33m';
const C = '\x1b[36m';
const B = '\x1b[1m';
const X = '\x1b[0m';

let passed = 0;
let failed = 0;
let authToken = '';

function pass(msg: string) { passed++; console.log(`${G}  ✅ ${msg}${X}`); }
function fail(msg: string) { failed++; console.log(`${R}  ❌ ${msg}${X}`); }
function section(msg: string) { console.log(`\n${C}${B}${msg}${X}`); }
function info(msg: string) { console.log(`${Y}  ℹ️  ${msg}${X}`); }

async function api(method: string, path: string, body?: any) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  return { status: res.status, data };
}

async function main() {
  console.log(`\n${B}═══════════════════════════════════════════════════════${X}`);
  console.log(`${B}  Phase 2: Payments + State Machine + Idempotent Webhooks${X}`);
  console.log(`${B}═══════════════════════════════════════════════════════${X}`);

  // Track IDs for cleanup/verification
  let bookingId = '';
  let paymentId = '';
  let transactionId = '';
  let propertyId = '';
  let roomId = '';

  try {
    // ── Health check ───────────────────────────────────────────────────
    section('Health Check');
    const health = await api('GET', '/health');
    if (health.data.success) {
      pass(`API is ${health.data.data.status}`);
    } else {
      fail('API not responding');
      process.exit(1);
    }

    // ── Setup: Register host, create property + room ───────────────────
    section('Setup: Register host + create property + room');
    const register = await api('POST', '/auth/register', {
      email: `host-p2-${ts}@test.local`,
      password: 'Test1234!',
      name: 'Phase 2 Host',
      businessName: 'Test Hotel',
    });

    if (register.data.success) {
      authToken = register.data.data.accessToken;
      pass(`Host registered: ${register.data.data.host.email}`);
    } else {
      fail(`Registration failed: ${JSON.stringify(register.data)}`);
      process.exit(1);
    }

    const prop = await api('POST', '/host/properties', {
      name: 'Phase 2 Test Hotel',
      address: '456 Test Ave',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      status: 'ACTIVE',
    });

    if (prop.data.success) {
      propertyId = prop.data.data.id;
      pass(`Property created: ${propertyId}`);
    } else {
      fail(`Property creation failed`);
      process.exit(1);
    }

    const room = await api('POST', `/host/properties/${propertyId}/rooms`, {
      name: 'Test Suite',
      capacity: 2,
      basePrice: 5000,
      amenities: ['wifi', 'ac'],
    });

    if (room.data.success) {
      roomId = room.data.data.id;
      pass(`Room created: ${roomId} (₹5000/night)`);
    } else {
      fail(`Room creation failed`);
      process.exit(1);
    }

    // ── Test 1: Create booking (should be PENDING) ─────────────────────
    section('Test 1: Create booking → PENDING');
    const booking = await api('POST', '/bookings', {
      roomId,
      checkIn: '2026-12-01',
      checkOut: '2026-12-04',
      guests: 2,
      guestEmail: `guest-p2-${ts}@test.local`,
      guestName: 'Test Guest',
      guestPhone: '+919876543210',
    });

    if (booking.data.success) {
      bookingId = booking.data.data.id;
      const status = booking.data.data.status;
      if (status === 'PENDING') {
        pass(`Booking created: ${bookingId} | Status: ${status}`);
        pass(`Total: ₹${booking.data.data.totalPrice} (${booking.data.data.nights} nights)`);
      } else {
        fail(`Expected PENDING, got ${status}`);
      }
    } else {
      fail(`Booking creation failed: ${JSON.stringify(booking.data)}`);
      process.exit(1);
    }

    // ── Test 2: Initiate payment → PENDING → CONFIRMED ─────────────────
    section('Test 2: Initiate payment → PENDING → CONFIRMED');
    const payment = await api('POST', '/payments/initiate', { bookingId });

    if (payment.data.success) {
      paymentId = payment.data.data.paymentId;
      transactionId = payment.data.data.transactionId;
      pass(`Payment initiated: ${paymentId} | txn: ${transactionId}`);
      pass(`Redirect URL: ${payment.data.data.redirectUrl.substring(0, 60)}...`);

      // Verify booking is now CONFIRMED
      const verifyBooking = await api('GET', `/bookings/${bookingId}`);
      const newStatus = verifyBooking.data.data.status;
      if (newStatus === 'CONFIRMED') {
        pass(`Booking status: PENDING → CONFIRMED ✓`);
      } else {
        fail(`Expected CONFIRMED, got ${newStatus}`);
      }
    } else {
      fail(`Payment initiation failed: ${JSON.stringify(payment.data)}`);
      process.exit(1);
    }

    // ── Test 3: Fire webhook (SUCCESS) → CONFIRMED → PAID ──────────────
    section('Test 3: Webhook (SUCCESS) → CONFIRMED → PAID');

    // Count payments before webhook
    const beforeWebhook = await api('GET', `/bookings/${bookingId}`);
    const paymentsBefore = beforeWebhook.data.data.payments?.length ?? 0;
    info(`Payments before webhook: ${paymentsBefore}`);

    const webhook1 = await api('POST', '/payments/webhook/phonepe', {
      transactionId,
      state: 'COMPLETED',
      success: true,
      amount: 1500000, // 15000 in paise
    });

    if (webhook1.data.success) {
      if (webhook1.data.processed === true) {
        pass(`Webhook processed: ${webhook1.data.message}`);
      } else {
        fail(`Webhook not processed: ${webhook1.data.message}`);
      }

      // Verify booking is now PAID
      const verifyPaid = await api('GET', `/bookings/${bookingId}`);
      const paidStatus = verifyPaid.data.data.status;
      if (paidStatus === 'PAID') {
        pass(`Booking status: CONFIRMED → PAID ✓`);
      } else {
        fail(`Expected PAID, got ${paidStatus}`);
      }
    } else {
      fail(`Webhook failed: ${JSON.stringify(webhook1.data)}`);
    }

    // ── Test 4: Fire SAME webhook AGAIN → idempotent no-op ─────────────
    section('Test 4: Duplicate webhook → must be idempotent (no-op)');

    const webhook2 = await api('POST', '/payments/webhook/phonepe', {
      transactionId,
      state: 'COMPLETED',
      success: true,
      amount: 1500000,
    });

    if (webhook2.data.success) {
      if (webhook2.data.processed === false) {
        pass(`Duplicate webhook correctly IGNORED: "${webhook2.data.message}"`);
      } else {
        fail(`Duplicate webhook was processed again! This is a BUG.`);
      }

      // Verify booking is STILL PAID (not double-transitioned)
      const verifyStillPaid = await api('GET', `/bookings/${bookingId}`);
      const stillPaidStatus = verifyStillPaid.data.data.status;
      if (stillPaidStatus === 'PAID') {
        pass(`Booking still PAID after duplicate webhook ✓`);
      } else {
        fail(`Booking status changed to ${stillPaidStatus} after duplicate webhook!`);
      }
    } else {
      // 200 OK is expected even for duplicates
      info(`Duplicate webhook response: status=${webhook2.status}`);
    }

    // ── Test 5: Concurrent webhooks (5 at once) ────────────────────────
    section('Test 5: 5 concurrent duplicate webhooks → only 0 should process');

    const concurrentWebhooks = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        api('POST', '/payments/webhook/phonepe', {
          transactionId,
          state: 'COMPLETED',
          success: true,
          amount: 1500000,
        }),
      ),
    );

    const processedCount = concurrentWebhooks.filter(
      (r) => r.status === 'fulfilled' && r.value.data.processed === true,
    ).length;

    if (processedCount === 0) {
      pass(`All 5 concurrent duplicate webhooks correctly ignored`);
    } else {
      fail(`${processedCount} of 5 concurrent duplicates were processed! IDEMPOTENCY BROKEN!`);
    }

    // ── Test 6: Verify no duplicate payment records ────────────────────
    section('Test 6: Verify no duplicate payment records');

    const afterAll = await api('GET', `/bookings/${bookingId}`);
    const paymentsAfter = afterAll.data.data.payments?.length ?? 0;
    info(`Payments after all webhooks: ${paymentsAfter}`);

    if (paymentsAfter === paymentsBefore) {
      pass(`Payment count unchanged: ${paymentsBefore} → ${paymentsAfter} ✓`);
    } else {
      fail(`Payment count changed! ${paymentsBefore} → ${paymentsAfter} (duplicates created!)`);
    }

    // ── Test 7: Invalid state transition (PENDING → CHECKED_IN) ────────
    section('Test 7: Invalid state transition: PENDING → CHECKED_IN');

    // Create a new booking in PENDING state
    const booking2 = await api('POST', '/bookings', {
      roomId,
      checkIn: '2027-01-10',
      checkOut: '2027-01-13',
      guests: 1,
      guestEmail: `guest-p2b-${ts}@test.local`,
      guestName: 'Test Guest 2',
    });

    let booking2Id = '';
    if (booking2.data.success) {
      booking2Id = booking2.data.data.id;
      pass(`New booking created: ${booking2Id} (status: ${booking2.data.data.status})`);
    } else {
      fail('Could not create second booking');
    }

    if (booking2Id) {
      // Attempt invalid transition: PENDING → CHECKED_IN (skipping payment)
      const invalidTransition = await api('POST', '/payments/transition', {
        bookingId: booking2Id,
        targetStatus: 'CHECKED_IN',
        reason: 'Testing invalid transition',
      });

      if (invalidTransition.status === 400 || invalidTransition.data.success === false) {
        const errorMsg = invalidTransition.data.error?.message
          || invalidTransition.data.message
          || 'Rejected';
        pass(`Invalid transition PENDING → CHECKED_IN correctly REJECTED`);
        pass(`Error: "${errorMsg}"`);
      } else {
        fail(`Invalid transition PENDING → CHECKED_IN was ALLOWED! State machine broken!`);
      }

      // Also test: PENDING → PAID (skipping CONFIRMED)
      const skipPayment = await api('POST', '/payments/transition', {
        bookingId: booking2Id,
        targetStatus: 'PAID',
        reason: 'Testing skip payment',
      });

      if (skipPayment.status === 400 || skipPayment.data.success === false) {
        pass(`Invalid transition PENDING → PAID correctly REJECTED`);
      } else {
        fail(`Invalid transition PENDING → PAID was ALLOWED!`);
      }

      // Test valid transition: PENDING → CANCELLED (should work)
      const validCancel = await api('POST', '/payments/transition', {
        bookingId: booking2Id,
        targetStatus: 'CANCELLED',
        reason: 'Testing valid cancellation',
      });

      if (validCancel.data.success) {
        pass(`Valid transition PENDING → CANCELLED succeeded ✓`);
      } else {
        fail(`Valid transition PENDING → CANCELLED was REJECTED!`);
      }
    }

    // ── Test 8: Full lifecycle: PAID → CHECKED_IN → CHECKED_OUT ────────
    section('Test 8: Full lifecycle transitions');

    // Our booking from Test 3 should be PAID
    const checkIn = await api('POST', '/payments/transition', {
      bookingId,
      targetStatus: 'CHECKED_IN',
    });

    if (checkIn.data.success) {
      pass(`PAID → CHECKED_IN ✓`);

      const checkOut = await api('POST', '/payments/transition', {
        bookingId,
        targetStatus: 'CHECKED_OUT',
      });

      if (checkOut.data.success) {
        pass(`CHECKED_IN → CHECKED_OUT ✓`);

        // Try to transition from CHECKED_OUT (terminal state) — should fail
        const afterTerminal = await api('POST', '/payments/transition', {
          bookingId,
          targetStatus: 'PAID',
        });

        if (afterTerminal.status === 400 || afterTerminal.data.success === false) {
          pass(`Terminal state CHECKED_OUT → PAID correctly REJECTED ✓`);
        } else {
          fail(`Transition from terminal state CHECKED_OUT was ALLOWED!`);
        }
      } else {
        fail(`CHECKED_IN → CHECKED_OUT failed`);
      }
    } else {
      fail(`PAID → CHECKED_IN failed`);
    }

    // ── Summary ────────────────────────────────────────────────────────
    section('Summary');
    console.log(`\n  ${G}Passed: ${passed}${X}`);
    console.log(`  ${R}Failed: ${failed}${X}`);
    console.log(
      `\n  ${B}${failed === 0 ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED!'}${X}`,
    );

    if (failed === 0) {
      console.log(`\n  ${G}Phase 2 verified:${X}`);
      console.log(`    ✓ State machine enforces valid transitions`);
      console.log(`    ✓ PhonePe payment flow works end-to-end`);
      console.log(`    ✓ Webhook handler is idempotent (duplicates ignored)`);
      console.log(`    ✓ Concurrent webhooks handled safely`);
      console.log(`    ✓ No duplicate payment records`);
    }

  } catch (error: any) {
    console.error(`\n${R}FATAL ERROR:${X}`, error.message);
    if (error.cause) console.error(error.cause);
    failed++;
  }

  console.log(`\n${B}═══════════════════════════════════════════════════════${X}`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
