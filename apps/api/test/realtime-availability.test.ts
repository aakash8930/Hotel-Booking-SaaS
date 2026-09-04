/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Realtime Availability Test — simulates the "two browser tabs" scenario
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Opens two independent WebSocket connections (standing in for two browser
 * tabs) subscribed to the same property, then exercises the full pipeline:
 *
 *   REST booking create → NestJS publishes to Redis → Go service subscribes
 *   → broadcasts to every WS client subscribed to that property
 *
 * Confirms BOTH connections receive room.held on booking creation and
 * room.released on cancellation — the Phase 4 exit criteria from the
 * roadmap, verified at the transport level since no browser is available
 * in this environment.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import 'dotenv/config';

const API_BASE = 'http://localhost:4000/api/v1';
const WS_URL = 'ws://localhost:4001/ws';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;

function pass(msg: string) {
  console.log(`${GREEN}  ✅ ${msg}${RESET}`);
  passed++;
}

function fail(msg: string) {
  console.log(`${RED}  ❌ ${msg}${RESET}`);
  failed++;
}

async function api(method: string, path: string, body?: unknown, token?: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: res.status, data: await res.json() };
}

function waitForEvent(
  ws: WebSocket,
  predicate: (event: any) => boolean,
  timeoutMs = 8000,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.removeEventListener('message', handler);
      reject(new Error('Timed out waiting for event'));
    }, timeoutMs);

    function handler(msg: MessageEvent) {
      try {
        const parsed = JSON.parse(msg.data as string);
        if (predicate(parsed)) {
          clearTimeout(timer);
          ws.removeEventListener('message', handler);
          resolve(parsed);
        }
      } catch {
        // ignore non-JSON frames
      }
    }

    ws.addEventListener('message', handler);
  });
}

function openSubscribedSocket(propertyId: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({ action: 'subscribe', propertyId }));
      resolve(ws);
    });
    ws.addEventListener('error', reject);
  });
}

async function main() {
  console.log('\n=== Realtime Availability Test (two simulated tabs) ===\n');

  const ts = Date.now();

  // ── Setup: host + property + room ──────────────────────────────────
  const reg = await api('POST', '/auth/register', {
    email: `host-rt-${ts}@test.local`,
    password: 'Test1234!',
    name: 'Realtime Test Host',
  });
  const token = reg.data.data.accessToken;

  const prop = await api(
    'POST',
    '/host/properties',
    {
      name: 'Realtime Test Property',
      description: 'x',
      address: '123 Realtime Street',
      city: 'City',
      state: 'St',
      pincode: '123456',
      checkInTime: '14:00',
      checkOutTime: '11:00',
    },
    token,
  );
  const propertyId = prop.data.data.id;

  const room = await api(
    'POST',
    `/host/properties/${propertyId}/rooms`,
    { name: 'Realtime Room', description: 'x', capacity: 2, basePrice: 1000, amenities: [] },
    token,
  );
  const roomId = room.data.data.id;

  pass(`Property + room created: ${propertyId} / ${roomId}`);

  // ── Open two WebSocket "tabs" subscribed to the same property ──────
  const tabA = await openSubscribedSocket(propertyId);
  const tabB = await openSubscribedSocket(propertyId);
  pass('Two WebSocket clients connected and subscribed to the property');

  // Give the subscribe message a moment to land before triggering events
  await new Promise((r) => setTimeout(r, 300));

  // ── Trigger: create a booking (room.held) ───────────────────────────
  const heldA = waitForEvent(tabA, (e) => e.type === 'room.held' && e.roomId === roomId);
  const heldB = waitForEvent(tabB, (e) => e.type === 'room.held' && e.roomId === roomId);

  const booking = await api('POST', '/bookings', {
    roomId,
    checkIn: '2027-02-01',
    checkOut: '2027-02-03',
    guests: 1,
    guestEmail: `guest-rt-${ts}@test.local`,
    guestName: 'Realtime Guest',
  });
  const bookingId = booking.data.data.id;

  try {
    await Promise.all([heldA, heldB]);
    pass('Both tabs received room.held for the new booking');
  } catch {
    fail('Did not receive room.held on both tabs within timeout');
  }

  // ── Trigger: cancel the booking (room.released) ─────────────────────
  const releasedA = waitForEvent(tabA, (e) => e.type === 'room.released' && e.roomId === roomId);
  const releasedB = waitForEvent(tabB, (e) => e.type === 'room.released' && e.roomId === roomId);

  await api('POST', `/bookings/${bookingId}/cancel`, {});

  try {
    await Promise.all([releasedA, releasedB]);
    pass('Both tabs received room.released after cancellation');
  } catch {
    fail('Did not receive room.released on both tabs within timeout');
  }

  tabA.close();
  tabB.close();

  console.log('\n=== Summary ===');
  console.log(`${GREEN}Passed: ${passed}${RESET}`);
  console.log(failed > 0 ? `${RED}Failed: ${failed}${RESET}` : `${GREEN}Failed: 0${RESET}`);
  console.log(failed === 0 ? `\n${GREEN}🎉 ALL TESTS PASSED!${RESET}\n` : '\n');

  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
