#!/usr/bin/env tsx
/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Payout Generation Race Test — Phase 6 hardening
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * PayoutsService.generate() reads a host's unclaimed paid bookings, then
 * claims them into a new Payout batch. Without care, two concurrent calls
 * (a double-click, a client retry after a slow response) can both read the
 * same "unclaimed" bookings before either claims them — producing two
 * Payout rows that double-count the same revenue. There's no DB constraint
 * like the booking EXCLUDE constraint to prevent this declaratively, so the
 * fix uses a SERIALIZABLE transaction instead: this test proves it holds
 * under real concurrent HTTP load.
 *
 * Test plan:
 *   1. Create a host (via real registration, so we get a real JWT) with a
 *      property + room, and N paid (SUCCESS-payment) bookings for it.
 *   2. Fire M concurrent POST /host/payouts requests with that host's token.
 *   3. Verify exactly 1 succeeds and claims all N bookings; the rest fail
 *      with "nothing to settle" (either immediately, or after a
 *      serialization-failure retry finds the pool already claimed).
 *   4. Verify no booking ended up claimed by more than one payout, and the
 *      total netPayable isn't double-counted.
 *   5. Clean up test data.
 *
 * Usage:
 *   pnpm test:payout-race               # 10 concurrent requests (default)
 *   pnpm test:payout-race -- 20         # override request count
 *
 * Prerequisites: the API server must be running (pnpm dev:api).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../../../.env') });
config({ path: resolve(__dirname, '../../.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;

function pass(msg: string) {
  passed++;
  console.log(`${GREEN}  ✅ ${msg}${RESET}`);
}

function fail(msg: string) {
  failed++;
  console.log(`${RED}  ❌ ${msg}${RESET}`);
}

function section(msg: string) {
  console.log(`\n${CYAN}${BOLD}${msg}${RESET}`);
}

const API_BASE = process.env.API_URL || `http://localhost:${process.env.PORT || 4000}/api/v1`;
const CONCURRENT_REQUESTS = Number(process.argv[2]) || 10;
const BOOKING_COUNT = 5;

async function checkServerUp(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log(`\n${BOLD}═══════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}  Payout Generation Race Test — POST /host/payouts${RESET}`);
  console.log(`${BOLD}  ${CONCURRENT_REQUESTS} simultaneous requests, same host, ${BOOKING_COUNT} eligible bookings${RESET}`);
  console.log(`${BOLD}═══════════════════════════════════════════════════════${RESET}`);

  const runId = Date.now();
  const ids: {
    hostId?: string;
    propertyId?: string;
    roomId?: string;
    guestId?: string;
    bookingIds: string[];
  } = { bookingIds: [] };

  section('Preflight: checking API server is reachable...');
  if (!(await checkServerUp())) {
    fail(`Could not reach ${API_BASE}/health — is the API server running? (pnpm dev:api)`);
    await prisma.$disconnect();
    process.exit(1);
  }
  pass(`API server reachable at ${API_BASE}`);

  try {
    section('Setup: registering test host and creating paid bookings...');

    const hostEmail = `payout-race-host-${runId}@test.local`;
    const registerRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: hostEmail, password: 'TestPass123', name: 'Payout Race Host' }),
    });
    const registerBody = await registerRes.json();
    const hostToken: string = registerBody.data.accessToken;
    const hostId: string = registerBody.data.host.id;
    ids.hostId = hostId;

    const property = await prisma.property.create({
      data: {
        hostId,
        name: 'Payout Race Property',
        slug: `payout-race-property-${runId}`,
        address: '123 Race Test St',
        city: 'Testville',
        state: 'Test State',
        pincode: '123456',
        status: 'ACTIVE',
      },
    });
    ids.propertyId = property.id;

    const room = await prisma.room.create({
      data: { propertyId: property.id, name: 'Race Room', capacity: 4, basePrice: 1000 },
    });
    ids.roomId = room.id;

    const guest = await prisma.guest.create({
      data: { email: `payout-race-guest-${runId}@test.local`, name: 'Payout Race Guest' },
    });
    ids.guestId = guest.id;

    // Distinct, non-overlapping date ranges so the EXCLUDE constraint
    // doesn't get in the way — this test is about the payout race, not
    // the booking race.
    for (let i = 0; i < BOOKING_COUNT; i++) {
      const checkIn = new Date(Date.now() + (365 + i * 3) * 86400000);
      const checkOut = new Date(checkIn.getTime() + 2 * 86400000);

      const booking = await prisma.booking.create({
        data: {
          roomId: room.id,
          guestId: guest.id,
          checkIn,
          checkOut,
          guests: 1,
          status: 'PAID',
          totalPrice: 2000,
        },
      });
      ids.bookingIds.push(booking.id);

      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          amount: 2000,
          status: 'SUCCESS',
          provider: 'phonepe',
          providerTxnId: `RACE-TEST-${runId}-${i}`,
          completedAt: new Date(),
        },
      });
    }

    pass(`${BOOKING_COUNT} paid bookings created for host ${hostId}`);

    section(`Test: firing ${CONCURRENT_REQUESTS} concurrent POST /host/payouts...`);

    const requests = Array.from({ length: CONCURRENT_REQUESTS }, () =>
      fetch(`${API_BASE}/host/payouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hostToken}` },
      }).then(async (res) => ({ status: res.status, body: await res.json().catch(() => null) })),
    );

    const results = await Promise.all(requests);

    const successes = results.filter((r) => r.status === 201 || r.status === 200);
    const rejections = results.filter((r) => r.status === 400);
    const unexpected = results.filter((r) => r.status !== 201 && r.status !== 200 && r.status !== 400);

    console.log(
      `\n  Results: ${successes.length} succeeded, ${rejections.length} rejected ("nothing to settle"), ${unexpected.length} unexpected`,
    );

    if (unexpected.length > 0) {
      for (const r of unexpected.slice(0, 5)) {
        console.log(`  ${YELLOW}⚠️  Unexpected status ${r.status}: ${JSON.stringify(r.body)}${RESET}`);
      }
    }

    if (successes.length === 1) {
      pass(`Exactly 1 of ${CONCURRENT_REQUESTS} concurrent payout requests succeeded (correct!)`);
    } else if (successes.length === 0) {
      fail(`All ${CONCURRENT_REQUESTS} requests failed — nothing succeeded, unexpected`);
    } else {
      fail(
        `${successes.length} of ${CONCURRENT_REQUESTS} concurrent requests succeeded — ` +
          `DOUBLE-COUNTED PAYOUT DETECTED! The same bookings' revenue may have been claimed by multiple batches.`,
      );
    }

    const winningPayout = successes[0]?.body?.data;
    if (winningPayout && winningPayout.bookingCount === BOOKING_COUNT) {
      pass(`Winning payout claimed all ${BOOKING_COUNT} eligible bookings (₹${winningPayout.netPayable} net)`);
    } else if (winningPayout) {
      fail(`Winning payout claimed ${winningPayout.bookingCount} bookings, expected ${BOOKING_COUNT}`);
    }

    section('Verifying no booking was claimed by more than one payout...');
    const claimedBookings = await prisma.booking.findMany({
      where: { id: { in: ids.bookingIds } },
      select: { id: true, payoutId: true },
    });
    const distinctPayoutIds = new Set(claimedBookings.map((b) => b.payoutId).filter(Boolean));
    const unclaimed = claimedBookings.filter((b) => !b.payoutId);

    if (distinctPayoutIds.size === 1 && unclaimed.length === 0) {
      pass('All bookings claimed by exactly one, single payout batch');
    } else {
      fail(
        `Bookings claimed by ${distinctPayoutIds.size} distinct payouts, ${unclaimed.length} left unclaimed — ` +
          'expected all claimed by exactly 1 payout',
      );
    }

    const allPayouts = await prisma.payout.findMany({ where: { hostId } });
    if (allPayouts.length === 1) {
      pass('Exactly 1 Payout row exists for this host (no phantom duplicate batches)');
    } else {
      fail(`${allPayouts.length} Payout rows exist for this host — expected exactly 1`);
    }

    section('Summary');
    console.log(`\n  ${GREEN}Passed: ${passed}${RESET}`);
    console.log(`  ${RED}Failed: ${failed}${RESET}`);
    console.log(
      `\n  ${BOLD}${failed === 0 ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED!'}${RESET}`,
    );
    console.log(
      `\n  ${
        failed === 0
          ? `SERIALIZABLE isolation holds under ${CONCURRENT_REQUESTS}-way concurrent payout generation — no double-counted revenue.`
          : 'Payout race condition reproduced. Do not accept this in production — a host could be paid out twice for the same bookings.'
      }${RESET}`,
    );
  } catch (error: any) {
    console.error(`\n${RED}FATAL ERROR:${RESET}`, error.message);
    failed++;
  } finally {
    section('Cleanup: removing test data...');
    try {
      if (ids.bookingIds.length > 0) {
        await prisma.payment.deleteMany({ where: { bookingId: { in: ids.bookingIds } } });
        await prisma.payout.deleteMany({ where: { hostId: ids.hostId } });
        await prisma.booking.deleteMany({ where: { id: { in: ids.bookingIds } } });
      }
      if (ids.roomId) await prisma.room.deleteMany({ where: { id: ids.roomId } });
      if (ids.propertyId) await prisma.property.deleteMany({ where: { id: ids.propertyId } });
      if (ids.guestId) await prisma.guest.deleteMany({ where: { id: ids.guestId } });
      if (ids.hostId) {
        await prisma.refreshToken.deleteMany({ where: { hostId: ids.hostId } });
        await prisma.host.deleteMany({ where: { id: ids.hostId } });
      }
      pass('Test data cleaned up');
    } catch (error: any) {
      console.log(`${YELLOW}  ⚠️  Cleanup warning: ${error.message}${RESET}`);
    }

    await prisma.$disconnect();

    console.log(`\n${BOLD}═══════════════════════════════════════════════════════${RESET}`);

    if (failed > 0) {
      process.exit(1);
    }
  }
}

main();
