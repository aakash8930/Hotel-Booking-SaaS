#!/usr/bin/env tsx
/**
 * ─────────────────────────────────────────────────────────────────────────────
 * EXCLUDE Constraint Verification Test
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * This script proves that the database-level EXCLUDE constraint prevents
 * double-bookings, even under concurrent load.
 *
 * Test plan:
 *   1. Create a test property and room
 *   2. Create Booking A for Oct 15-18 (should succeed)
 *   3. Create Booking B for Oct 16-19 (overlapping — should FAIL)
 *   4. Create Booking C for Oct 18-20 (adjacent, not overlapping — should succeed)
 *   5. Cancel Booking A, then retry Booking B (should now succeed)
 *   6. Test concurrent inserts: fire 5 overlapping bookings simultaneously,
 *      verify exactly 1 succeeds
 *   7. Clean up test data
 *
 * Usage:
 *   pnpm --filter @hbs/prisma exec tsx test/exclude-constraint.test.ts
 *
 * Prerequisites:
 *   - DATABASE_URL set in .env
 *   - Schema pushed: pnpm db:push
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { PrismaClient, BookingStatus } from '@prisma/client';

const prisma = new PrismaClient();

// ANSI colors for terminal output
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

async function cleanup(ids: {
  roomId?: string;
  propertyId?: string;
  hostId?: string;
  guestId?: string;
  bookingIds?: string[];
}) {
  // Delete in reverse dependency order
  if (ids.bookingIds?.length) {
    await prisma.booking.deleteMany({
      where: { id: { in: ids.bookingIds } },
    });
  }

  // Delete any remaining bookings for the room
  if (ids.roomId) {
    await prisma.booking.deleteMany({ where: { roomId: ids.roomId } });
  }

  if (ids.roomId) {
    await prisma.room.deleteMany({ where: { id: ids.roomId } });
  }

  if (ids.propertyId) {
    await prisma.room.deleteMany({ where: { propertyId: ids.propertyId } });
    await prisma.property.deleteMany({ where: { id: ids.propertyId } });
  }

  if (ids.hostId) {
    await prisma.refreshToken.deleteMany({ where: { hostId: ids.hostId } });
    await prisma.host.deleteMany({ where: { id: ids.hostId } });
  }

  if (ids.guestId) {
    await prisma.guest.deleteMany({ where: { id: ids.guestId } });
  }
}

async function main() {
  console.log(`\n${BOLD}═══════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}  EXCLUDE Constraint Verification Test${RESET}`);
  console.log(`${BOLD}  Testing: no_overlapping_bookings constraint${RESET}`);
  console.log(`${BOLD}═══════════════════════════════════════════════════════${RESET}`);

  const ids: {
    roomId?: string;
    propertyId?: string;
    hostId?: string;
    guestId?: string;
    bookingIds: string[];
  } = { bookingIds: [] };

  try {
    // ── Setup: Create test data ──────────────────────────────────────
    section('Setup: Creating test data...');

    const host = await prisma.host.create({
      data: {
        email: `test-host-${Date.now()}@test.local`,
        passwordHash: 'test-hash-not-real',
        name: 'Test Host',
      },
    });
    ids.hostId = host.id;

    const property = await prisma.property.create({
      data: {
        hostId: host.id,
        name: 'Test Property',
        slug: `test-property-${Date.now()}`,
        address: '123 Test St',
        city: 'Testville',
        state: 'Test State',
        pincode: '123456',
        status: 'ACTIVE',
      },
    });
    ids.propertyId = property.id;

    const room = await prisma.room.create({
      data: {
        propertyId: property.id,
        name: 'Test Room',
        capacity: 2,
        basePrice: 2500,
      },
    });
    ids.roomId = room.id;

    const guest = await prisma.guest.create({
      data: {
        email: `test-guest-${Date.now()}@test.local`,
        name: 'Test Guest',
      },
    });
    ids.guestId = guest.id;

    pass('Test data created');

    // ── Test 1: First booking should succeed ─────────────────────────
    section('Test 1: Create initial booking (Oct 15-18)');

    const bookingA = await prisma.booking.create({
      data: {
        roomId: room.id,
        guestId: guest.id,
        checkIn: new Date('2026-10-15'),
        checkOut: new Date('2026-10-18'),
        guests: 2,
        status: BookingStatus.CONFIRMED,
        totalPrice: 7500,
      },
    });
    ids.bookingIds.push(bookingA.id);
    pass(`Booking A created: ${bookingA.id} (Oct 15 → Oct 18)`);

    // ── Test 2: Overlapping booking should FAIL ──────────────────────
    section('Test 2: Attempt overlapping booking (Oct 16-19) — should FAIL');

    try {
      const bookingB = await prisma.booking.create({
        data: {
          roomId: room.id,
          guestId: guest.id,
          checkIn: new Date('2026-10-16'), // Overlaps with A
          checkOut: new Date('2026-10-19'),
          guests: 1,
          status: BookingStatus.CONFIRMED,
          totalPrice: 7500,
        },
      });

      fail(`UNEXPECTED: Overlapping booking was created! ID: ${bookingB.id}`);
      fail('The EXCLUDE constraint is NOT working!');
      ids.bookingIds.push(bookingB.id);
    } catch (error: any) {
      if (
        error.message?.includes('no_overlapping_bookings') ||
        error.message?.includes('23P01') ||
        error.message?.includes('exclusion constraint')
      ) {
        pass('Overlapping booking correctly REJECTED by database!');
        pass(`Error: ${error.message.split('\n')[0]}`);
      } else {
        fail(`Unexpected error type: ${error.message}`);
      }
    }

    // ── Test 3: Adjacent (non-overlapping) booking should succeed ────
    section('Test 3: Adjacent booking (Oct 18-20) — should succeed');

    const bookingC = await prisma.booking.create({
      data: {
        roomId: room.id,
        guestId: guest.id,
        checkIn: new Date('2026-10-18'), // Starts exactly when A ends
        checkOut: new Date('2026-10-20'),
        guests: 2,
        status: BookingStatus.CONFIRMED,
        totalPrice: 5000,
      },
    });
    ids.bookingIds.push(bookingC.id);
    pass(`Booking C created: ${bookingC.id} (Oct 18 → Oct 20, adjacent to A)`);

    // ── Test 4: PENDING status also blocks ───────────────────────────
    section('Test 4: PENDING booking blocks overlapping CONFIRMED');

    const pendingBooking = await prisma.booking.create({
      data: {
        roomId: room.id,
        guestId: guest.id,
        checkIn: new Date('2026-11-01'),
        checkOut: new Date('2026-11-05'),
        guests: 1,
        status: BookingStatus.PENDING,
        holdExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
        totalPrice: 10000,
      },
    });
    ids.bookingIds.push(pendingBooking.id);
    pass(`PENDING booking created: ${pendingBooking.id} (Nov 1 → Nov 5)`);

    try {
      await prisma.booking.create({
        data: {
          roomId: room.id,
          guestId: guest.id,
          checkIn: new Date('2026-11-03'), // Overlaps with pending
          checkOut: new Date('2026-11-07'),
          guests: 1,
          status: BookingStatus.CONFIRMED,
          totalPrice: 10000,
        },
      });
      fail('Overlapping CONFIRMED booking was created despite PENDING hold!');
    } catch (error: any) {
      if (
        error.message?.includes('no_overlapping_bookings') ||
        error.message?.includes('23P01') ||
        error.message?.includes('exclusion constraint')
      ) {
        pass('PENDING hold correctly blocks overlapping CONFIRMED booking');
      } else {
        fail(`Unexpected error: ${error.message}`);
      }
    }

    // ── Test 5: Cancelled bookings don't block ───────────────────────
    section('Test 5: Cancelled bookings should NOT block new bookings');

    // Cancel the pending booking
    await prisma.booking.update({
      where: { id: pendingBooking.id },
      data: { status: BookingStatus.CANCELLED },
    });

    // Now the same dates should be available
    const afterCancel = await prisma.booking.create({
      data: {
        roomId: room.id,
        guestId: guest.id,
        checkIn: new Date('2026-11-03'),
        checkOut: new Date('2026-11-07'),
        guests: 1,
        status: BookingStatus.CONFIRMED,
        totalPrice: 10000,
      },
    });
    ids.bookingIds.push(afterCancel.id);
    pass(`After cancellation, same dates booked successfully: ${afterCancel.id}`);

    // ── Test 6: Concurrent inserts — only 1 should succeed ──────────
    section('Test 6: Concurrent inserts (5 overlapping) — exactly 1 should succeed');

    const concurrentResults = await Promise.allSettled(
      Array.from({ length: 5 }, (_, i) =>
        prisma.booking.create({
          data: {
            roomId: room.id,
            guestId: guest.id,
            checkIn: new Date('2026-12-01'),
            checkOut: new Date('2026-12-05'),
            guests: 1,
            status: BookingStatus.CONFIRMED,
            totalPrice: 10000,
          },
        }),
      ),
    );

    const successes = concurrentResults.filter((r) => r.status === 'fulfilled');
    const failures = concurrentResults.filter((r) => r.status === 'rejected');

    // Collect successful booking IDs for cleanup
    for (const s of successes) {
      if (s.status === 'fulfilled') {
        ids.bookingIds.push(s.value.id);
      }
    }

    if (successes.length === 1) {
      pass(`Exactly 1 of 5 concurrent inserts succeeded (correct!)`);
      pass(`${failures.length} were rejected by the database`);
    } else if (successes.length === 0) {
      fail('All 5 concurrent inserts failed — unexpected');
    } else {
      fail(`${successes.length} of 5 concurrent inserts succeeded — DOUBLE BOOKING DETECTED!`);
      fail('The EXCLUDE constraint may not be working correctly under concurrent load');
    }

    // ── Test 7: Different rooms don't interfere ──────────────────────
    section('Test 7: Different rooms can be booked for same dates');

    const room2 = await prisma.room.create({
      data: {
        propertyId: property.id,
        name: 'Test Room 2',
        capacity: 2,
        basePrice: 3000,
      },
    });

    const room2Booking = await prisma.booking.create({
      data: {
        roomId: room2.id,
        guestId: guest.id,
        checkIn: new Date('2026-10-15'), // Same dates as Booking A
        checkOut: new Date('2026-10-18'),
        guests: 2,
        status: BookingStatus.CONFIRMED,
        totalPrice: 9000,
      },
    });
    ids.bookingIds.push(room2Booking.id);
    pass(`Different room booked for same dates: ${room2Booking.id}`);

    // ── Summary ──────────────────────────────────────────────────────
    section('Summary');
    console.log(`\n  ${GREEN}Passed: ${passed}${RESET}`);
    console.log(`  ${RED}Failed: ${failed}${RESET}`);
    console.log(
      `\n  ${BOLD}${failed === 0 ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED!'}${RESET}`,
    );
    console.log(
      `\n  ${failed === 0
        ? 'The EXCLUDE constraint correctly prevents double-bookings at the database level.'
        : 'There may be issues with the EXCLUDE constraint. Check the failures above.'
      }${RESET}`,
    );
  } catch (error: any) {
    console.error(`\n${RED}FATAL ERROR:${RESET}`, error.message);
    failed++;
  } finally {
    // ── Cleanup ──────────────────────────────────────────────────────
    section('Cleanup: Removing test data...');
    try {
      await cleanup(ids);
      pass('Test data cleaned up');
    } catch (error: any) {
      console.log(`${YELLOW}  ⚠️  Cleanup warning: ${error.message}${RESET}`);
    }

    await prisma.$disconnect();

    console.log(
      `\n${BOLD}═══════════════════════════════════════════════════════${RESET}`,
    );

    // Exit with error code if any tests failed
    if (failed > 0) {
      process.exit(1);
    }
  }
}

main();
