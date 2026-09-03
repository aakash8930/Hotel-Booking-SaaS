#!/usr/bin/env tsx
/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Booking Flow Integration Test (HTTP API)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Tests the full booking flow through the REST API:
 *   1. Register a host
 *   2. Create a property and room
 *   3. Search for available rooms
 *   4. Create a booking (soft-hold)
 *   5. Attempt overlapping booking → expect 409 Conflict
 *   6. Confirm the first booking
 *   7. Cancel and verify dates are released
 *
 * Prerequisites:
 *   - API server running on http://localhost:4000
 *   - Database set up with schema
 *
 * Usage:
 *   pnpm dev:api   # In terminal 1
 *   pnpm test:booking  # In terminal 2
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from project root
config({ path: resolve(__dirname, '../../../.env') });
config({ path: resolve(__dirname, '../../.env') });

const API = 'http://localhost:4000/api/v1';
const ts = Date.now();

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;
let authToken = '';

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

async function api(
  method: string,
  path: string,
  body?: any,
  headers?: Record<string, string>,
) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  return { status: res.status, data };
}

async function main() {
  console.log(`\n${BOLD}═══════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}  Booking Flow Integration Test (HTTP API)${RESET}`);
  console.log(`${BOLD}═══════════════════════════════════════════════════════${RESET}`);

  try {
    // ── Health check ─────────────────────────────────────────────────
    section('Health Check');
    const health = await api('GET', '/health');
    if (health.data.success) {
      pass(`API is ${health.data.data.status}`);
    } else {
      fail('API health check failed');
      process.exit(1);
    }

    // ── Step 1: Register a host ──────────────────────────────────────
    section('Step 1: Register a host');
    const register = await api('POST', '/auth/register', {
      email: `host-${ts}@test.local`,
      password: 'Test1234!',
      name: 'Test Host',
      businessName: 'Test Homestay',
    });

    if (register.status === 201 || register.data.success) {
      authToken = register.data.data.accessToken;
      pass(`Host registered: ${register.data.data.host.email}`);
    } else {
      fail(`Registration failed: ${JSON.stringify(register.data)}`);
      process.exit(1);
    }

    // ── Step 2: Create a property ────────────────────────────────────
    section('Step 2: Create a property');
    const prop = await api('POST', '/host/properties', {
      name: 'Mountain View Test Homestay',
      description: 'Test property for integration testing',
      address: '123 Test Street',
      city: 'Manali',
      state: 'Himachal Pradesh',
      pincode: '175131',
      status: 'ACTIVE',
      checkInTime: '14:00',
      checkOutTime: '11:00',
    });

    let propertyId: string;
    let propertySlug: string;

    if (prop.data.success) {
      propertyId = prop.data.data.id;
      propertySlug = prop.data.data.slug;
      pass(`Property created: ${prop.data.data.name} (${propertyId})`);
    } else {
      fail(`Property creation failed: ${JSON.stringify(prop.data)}`);
      process.exit(1);
    }

    // ── Step 3: Create rooms ─────────────────────────────────────────
    section('Step 3: Create rooms');
    const room1 = await api(
      'POST',
      `/host/properties/${propertyId}/rooms`,
      {
        name: 'Deluxe Mountain Room',
        description: 'Room with mountain view',
        capacity: 2,
        basePrice: 3500,
        amenities: ['wifi', 'heater', 'balcony'],
      },
    );

    const room2 = await api(
      'POST',
      `/host/properties/${propertyId}/rooms`,
      {
        name: 'Standard Room',
        description: 'Cozy standard room',
        capacity: 2,
        basePrice: 2000,
        amenities: ['wifi', 'heater'],
      },
    );

    let roomId1: string;
    let roomId2: string;

    if (room1.data.success && room2.data.success) {
      roomId1 = room1.data.data.id;
      roomId2 = room2.data.data.id;
      pass(`Room 1: ${room1.data.data.name} (₹${room1.data.data.basePrice}/night)`);
      pass(`Room 2: ${room2.data.data.name} (₹${room2.data.data.basePrice}/night)`);
    } else {
      fail('Room creation failed');
      process.exit(1);
    }

    // ── Step 4: Search for available rooms ───────────────────────────
    section('Step 4: Search for available rooms');
    const search = await api(
      'GET',
      `/search?city=Manali&checkIn=2026-11-10&checkOut=2026-11-13&guests=2`,
    );

    if (search.data.success) {
      const props = search.data.data.properties;
      pass(`Found ${props.length} properties with available rooms`);
      if (props.length > 0) {
        pass(`First result: ${props[0].name} — ${props[0].rooms.length} rooms available`);
      }
    } else {
      fail(`Search failed: ${JSON.stringify(search.data)}`);
    }

    // ── Step 5: Create Booking A (should succeed) ────────────────────
    section('Step 5: Create Booking A (Oct 15-18)');
    const bookingA = await api('POST', '/bookings', {
      roomId: roomId1,
      checkIn: '2026-10-15',
      checkOut: '2026-10-18',
      guests: 2,
      guestEmail: `guest-${ts}@test.local`,
      guestName: 'Test Guest',
      guestPhone: '+919876543210',
    });

    let bookingAId: string;

    if (bookingA.data.success) {
      bookingAId = bookingA.data.data.id;
      pass(`Booking A created: ${bookingAId}`);
      pass(`Status: ${bookingA.data.data.status} (soft-hold)`);
      pass(`Total: ₹${bookingA.data.data.totalPrice} (${bookingA.data.data.nights} nights)`);
      pass(`Hold expires: ${new Date(bookingA.data.data.holdExpiresAt).toLocaleTimeString()}`);
    } else {
      fail(`Booking A failed: ${JSON.stringify(bookingA.data)}`);
      process.exit(1);
    }

    // ── Step 6: Attempt overlapping Booking B (should FAIL) ──────────
    section('Step 6: Attempt overlapping Booking B (Oct 16-19) — should FAIL');
    const bookingB = await api('POST', '/bookings', {
      roomId: roomId1,
      checkIn: '2026-10-16',
      checkOut: '2026-10-19',
      guests: 1,
      guestEmail: `guest2-${ts}@test.local`,
      guestName: 'Another Guest',
    });

    if (bookingB.status === 409 || bookingB.data.error?.code === 'ROOM_NOT_AVAILABLE') {
      pass('Overlapping booking correctly REJECTED!');
      pass(`Error: ${bookingB.data.error?.message}`);
    } else if (bookingB.data.success) {
      fail('UNEXPECTED: Overlapping booking was created — EXCLUDE constraint not working!');
    } else {
      fail(`Unexpected response: status=${bookingB.status}, data=${JSON.stringify(bookingB.data)}`);
    }

    // ── Step 7: Adjacent booking should succeed ────────────────────────
    section('Step 7: Adjacent booking (Oct 18-20) — should succeed');
    const bookingC = await api('POST', '/bookings', {
      roomId: roomId1,
      checkIn: '2026-10-18',
      checkOut: '2026-10-20',
      guests: 2,
      guestEmail: `guest3-${ts}@test.local`,
      guestName: 'Third Guest',
    });

    if (bookingC.data.success) {
      pass(`Adjacent booking created: ${bookingC.data.data.id}`);
    } else {
      fail(`Adjacent booking failed: ${JSON.stringify(bookingC.data)}`);
    }

    // ── Step 8: Same dates, different room — should succeed ──────────
    section('Step 8: Same dates on Room 2 — should succeed');
    const bookingD = await api('POST', '/bookings', {
      roomId: roomId2,
      checkIn: '2026-10-15',
      checkOut: '2026-10-18',
      guests: 2,
      guestEmail: `guest4-${ts}@test.local`,
      guestName: 'Fourth Guest',
    });

    if (bookingD.data.success) {
      pass(`Different room, same dates: ${bookingD.data.data.id}`);
    } else {
      fail(`Different room booking failed: ${JSON.stringify(bookingD.data)}`);
    }

    // ── Step 9: Confirm Booking A ────────────────────────────────────
    section('Step 9: Confirm Booking A');
    const confirm = await api('POST', `/bookings/${bookingAId}/confirm`);

    if (confirm.data.success) {
      pass(`Booking confirmed: status=${confirm.data.data.status}`);
    } else {
      fail(`Confirmation failed: ${JSON.stringify(confirm.data)}`);
    }

    // ── Step 10: Cancel Booking A and verify dates released ──────────
    section('Step 10: Cancel Booking A, then book same dates');
    const cancel = await api('POST', `/bookings/${bookingAId}/cancel`, {
      reason: 'Testing cancellation',
    });

    if (cancel.data.success) {
      pass(`Booking cancelled: status=${cancel.data.data.status}`);
    } else {
      fail(`Cancellation failed: ${JSON.stringify(cancel.data)}`);
    }

    // Now try booking the same dates again
    const afterCancel = await api('POST', '/bookings', {
      roomId: roomId1,
      checkIn: '2026-10-15',
      checkOut: '2026-10-18',
      guests: 2,
      guestEmail: `guest5-${ts}@test.local`,
      guestName: 'Fifth Guest',
    });

    if (afterCancel.data.success) {
      pass(`After cancellation, same dates re-booked: ${afterCancel.data.data.id}`);
    } else {
      fail(`Re-booking after cancel failed: ${JSON.stringify(afterCancel.data)}`);
    }

    // ── Step 11: Host can see all bookings ───────────────────────────
    section('Step 11: Host views all bookings');
    const hostBookings = await api('GET', '/host/bookings');

    if (hostBookings.data.success) {
      pass(`Host sees ${hostBookings.data.data.length} bookings`);
    } else {
      fail(`Host bookings failed: ${JSON.stringify(hostBookings.data)}`);
    }

    // ── Summary ──────────────────────────────────────────────────────
    section('Summary');
    console.log(`\n  ${GREEN}Passed: ${passed}${RESET}`);
    console.log(`  ${RED}Failed: ${failed}${RESET}`);
    console.log(
      `\n  ${BOLD}${failed === 0 ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED!'}${RESET}`,
    );
  } catch (error: any) {
    console.error(`\n${RED}FATAL ERROR:${RESET}`, error.message);
    if (error.cause) console.error(error.cause);
    failed++;
  }

  console.log(
    `\n${BOLD}═══════════════════════════════════════════════════════${RESET}`,
  );

  process.exit(failed > 0 ? 1 : 0);
}

main();
