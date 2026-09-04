#!/usr/bin/env tsx
/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Concurrency Load Test — Phase 6 exit criterion
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * exclude-constraint.test.ts already proves the EXCLUDE constraint rejects
 * overlapping inserts made directly through Prisma in-process. This script
 * verifies the same guarantee holds one layer up: through the real HTTP API,
 * under a much larger burst, the way actual concurrent guests would hit it.
 *
 * Test plan:
 *   1. Create a test property and room directly via Prisma
 *   2. Fire N concurrent POST /bookings requests — same room, same dates,
 *      each as a distinct guest — against the running API server
 *   3. Verify exactly 1 request gets 201 (booking created) and the rest get
 *      409 ROOM_NOT_AVAILABLE
 *   4. Clean up test data
 *
 * Usage:
 *   pnpm test:load               # 30 concurrent requests (default)
 *   pnpm test:load -- 50         # override request count
 *
 * Prerequisites:
 *   - The API server must be running (pnpm dev:api) — this test hits it
 *     over HTTP, it does not boot the app in-process.
 *   - DATABASE_URL set in .env
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
const REQUEST_COUNT = Number(process.argv[2]) || 30;

async function checkServerUp(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

async function cleanup(ids: {
  roomId?: string;
  propertyId?: string;
  hostId?: string;
  guestEmailPrefix?: string;
}) {
  if (ids.roomId) {
    await prisma.booking.deleteMany({ where: { roomId: ids.roomId } });
    await prisma.room.deleteMany({ where: { id: ids.roomId } });
  }
  if (ids.propertyId) {
    await prisma.property.deleteMany({ where: { id: ids.propertyId } });
  }
  if (ids.hostId) {
    await prisma.refreshToken.deleteMany({ where: { hostId: ids.hostId } });
    await prisma.host.deleteMany({ where: { id: ids.hostId } });
  }
  if (ids.guestEmailPrefix) {
    await prisma.guest.deleteMany({
      where: { email: { startsWith: ids.guestEmailPrefix } },
    });
  }
}

async function main() {
  console.log(`\n${BOLD}═══════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}  Concurrency Load Test — POST /bookings${RESET}`);
  console.log(`${BOLD}  ${REQUEST_COUNT} simultaneous requests, same room + dates${RESET}`);
  console.log(`${BOLD}═══════════════════════════════════════════════════════${RESET}`);

  const ids: { roomId?: string; propertyId?: string; hostId?: string; guestEmailPrefix?: string } =
    {};

  section('Preflight: checking API server is reachable...');
  if (!(await checkServerUp())) {
    fail(`Could not reach ${API_BASE}/health — is the API server running? (pnpm dev:api)`);
    await prisma.$disconnect();
    process.exit(1);
  }
  pass(`API server reachable at ${API_BASE}`);

  try {
    section('Setup: creating test property and room...');

    const runId = Date.now();
    const host = await prisma.host.create({
      data: {
        email: `load-test-host-${runId}@test.local`,
        passwordHash: 'test-hash-not-real',
        name: 'Load Test Host',
      },
    });
    ids.hostId = host.id;

    const property = await prisma.property.create({
      data: {
        hostId: host.id,
        name: 'Load Test Property',
        slug: `load-test-property-${runId}`,
        address: '123 Load Test St',
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
        name: 'Load Test Room',
        capacity: 4,
        basePrice: 2500,
      },
    });
    ids.roomId = room.id;
    ids.guestEmailPrefix = `load-test-guest-${runId}`;

    pass(`Test room created: ${room.id}`);

    section(`Test: firing ${REQUEST_COUNT} concurrent bookings for the same dates...`);

    const checkIn = '2027-01-10';
    const checkOut = '2027-01-13';

    const requests = Array.from({ length: REQUEST_COUNT }, (_, i) =>
      fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          checkIn,
          checkOut,
          guests: 2,
          guestEmail: `${ids.guestEmailPrefix}-${i}@test.local`,
          guestName: `Load Test Guest ${i}`,
        }),
      }).then(async (res) => ({ status: res.status, body: await res.json().catch(() => null) })),
    );

    const results = await Promise.all(requests);

    const successes = results.filter((r) => r.status === 201);
    const conflicts = results.filter((r) => r.status === 409);
    const unexpected = results.filter((r) => r.status !== 201 && r.status !== 409);

    console.log(
      `\n  Results: ${successes.length} succeeded (201), ${conflicts.length} rejected (409), ${unexpected.length} unexpected`,
    );

    if (unexpected.length > 0) {
      for (const r of unexpected.slice(0, 5)) {
        console.log(`  ${YELLOW}⚠️  Unexpected status ${r.status}: ${JSON.stringify(r.body)}${RESET}`);
      }
    }

    if (successes.length === 1) {
      pass(`Exactly 1 of ${REQUEST_COUNT} concurrent requests succeeded (correct!)`);
    } else if (successes.length === 0) {
      fail(`All ${REQUEST_COUNT} requests failed — nothing succeeded, unexpected`);
    } else {
      fail(`${successes.length} of ${REQUEST_COUNT} concurrent requests succeeded — DOUBLE BOOKING DETECTED!`);
    }

    if (conflicts.length === REQUEST_COUNT - successes.length) {
      pass(`Remaining ${conflicts.length} requests correctly rejected with 409 ROOM_NOT_AVAILABLE`);
    } else {
      fail(`Expected ${REQUEST_COUNT - successes.length} rejections, got ${conflicts.length} (${unexpected.length} were neither 201 nor 409)`);
    }

    const badConflictShape = conflicts.filter((r) => r.body?.error?.code !== 'ROOM_NOT_AVAILABLE');
    if (badConflictShape.length === 0) {
      pass('All rejections carry the ROOM_NOT_AVAILABLE error code');
    } else {
      fail(`${badConflictShape.length} rejections had an unexpected error shape`);
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
          ? `The EXCLUDE constraint holds under ${REQUEST_COUNT}-way real HTTP concurrency — structurally impossible to double-book.`
          : 'Concurrency guarantee did not hold under load. Investigate before accepting real payments.'
      }${RESET}`,
    );
  } catch (error: any) {
    console.error(`\n${RED}FATAL ERROR:${RESET}`, error.message);
    failed++;
  } finally {
    section('Cleanup: removing test data...');
    try {
      await cleanup(ids);
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
