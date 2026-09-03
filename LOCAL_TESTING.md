# Local Testing Guide — Complete Step-by-Step

This guide walks you through cloning, setting up, and testing the Hotel Booking SaaS locally.

---

## Prerequisites

Before starting, ensure you have:

- **Node.js 20+** — Check with `node --version`
- **pnpm 9+** — Install with `npm install -g pnpm`
- **Docker & Docker Compose** — Check with `docker --version` and `docker compose version`
- **Git** — Check with `git --version`

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/aakash8930/Hotel-Booking-SaaS.git
cd Hotel-Booking-SaaS
```

---

## Step 2: Install Dependencies

```bash
pnpm install
```

This installs all Node.js dependencies across the monorepo (API, web, Prisma, shared packages).

**Expected output:**
```
Scope: all 5 workspace projects
...
Packages: +899
...
Done in 20.5s using pnpm v9.15.9
```

---

## Step 3: Start Infrastructure (Postgres + Redis)

```bash
docker compose up -d
```

**Verify containers are running:**
```bash
docker compose ps
```

**Expected output:**
```
NAME                IMAGE               STATUS              PORTS
hbs-postgres        postgres:16-alpine  Up                  0.0.0.0:5432->5432/tcp
hbs-redis           redis:7-alpine      Up                  0.0.0.0:6379->6379/tcp
```

---

## Step 4: Configure Environment Variables

```bash
cp .env.example .env
```

**Edit `.env` with your local config:**
```bash
nano .env  # or use your preferred editor
```

**Minimum required for local testing:**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hotel_booking_dev"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="dev-secret-change-me-at-least-32-characters-long"
JWT_REFRESH_SECRET="another-random-secret-for-refresh-tokens"
NEXT_PUBLIC_API_URL="http://localhost:4000"
NEXT_PUBLIC_WS_URL="ws://localhost:4001"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Generate secure JWT secrets (optional but recommended):**
```bash
openssl rand -hex 32
```

---

## Step 5: Generate Prisma Client

```bash
pnpm db:generate
```

**Expected output:**
```
> @hbs/prisma@0.1.0 generate
> prisma generate

✔ Generated Prisma Client (6.3.0) to ./node_modules/@prisma/client in 123ms
```

---

## Step 6: Push Database Schema

```bash
pnpm db:push
```

This creates all tables, indexes, and the critical EXCLUDE constraint.

**Expected output:**
```
> @hbs/prisma@0.1.0 push
> prisma db push

✔ Your database is now in sync with your Prisma schema. Done in 456ms
```

---

## Step 7: Seed Demo Data (Optional)

```bash
pnpm db:seed
```

**Expected output:**
```
> @hbs/prisma@0.1.0 seed
> tsx prisma/seed.ts

🌱 Seeding database...
  ✅ Host: Ananya Sharma (abc-123)
  ✅ Property: Mountain View Homestay (def-456)
  ✅ Rooms: Deluxe Mountain Room, Cozy Single Room, Family Suite
  ✅ Guest: Rahul Verma (ghi-789)
  ✅ Booking: jkl-012 (CONFIRMED)

🧪 Testing EXCLUDE constraint (expecting failure)...
  ✅ Overlapping booking correctly rejected by database!
  ✅ Non-overlapping booking created: mno-345

🎉 Seed complete!
```

---

## Step 8: Run the EXCLUDE Constraint Test ⭐

This is the critical test that proves double-bookings are impossible at the database level.

```bash
pnpm test:exclude
```

**Expected output:**
```
═══════════════════════════════════════════════════════
  EXCLUDE Constraint Verification Test
  Testing: no_overlapping_bookings constraint
═══════════════════════════════════════════════════════

Setup: Creating test data...
  ✅ Test data created

Test 1: Create initial booking (Oct 15-18)
  ✅ Booking A created: abc-123 (Oct 15 → Oct 18)

Test 2: Attempt overlapping booking (Oct 16-19) — should FAIL
  ✅ Overlapping booking correctly REJECTED by database!
  ✅ Error: conflicting key value violates exclusion constraint "no_overlapping_bookings"

Test 3: Adjacent booking (Oct 18-20) — should succeed
  ✅ Booking C created: def-456 (Oct 18 → Oct 20, adjacent to A)

Test 4: PENDING booking blocks overlapping CONFIRMED
  ✅ PENDING booking created: ghi-789 (Nov 1 → Nov 5)
  ✅ PENDING hold correctly blocks overlapping CONFIRMED booking

Test 5: Cancelled bookings should NOT block new bookings
  ✅ After cancellation, same dates booked successfully: jkl-012

Test 6: Concurrent inserts (5 overlapping) — exactly 1 should succeed
  ✅ Exactly 1 of 5 concurrent inserts succeeded (correct!)
  ✅ 4 were rejected by the database

Test 7: Different rooms can be booked for same dates
  ✅ Different room booked for same dates: mno-345

Summary

  Passed: 7
  Failed: 0

  🎉 ALL TESTS PASSED!

  The EXCLUDE constraint correctly prevents double-bookings at the database level.
```

**If any test fails**, check:
- Database is running: `docker compose ps`
- Schema is pushed: `pnpm db:push`
- Connection string is correct in `.env`

---

## Step 9: Start the API Server

Open a **new terminal** and run:

```bash
pnpm dev:api
```

**Expected output:**
```
[Nest] 12345  - 09/03/2026, 10:00:00 AM     LOG [NestFactory] Starting Nest application...
[Nest] 12345  - 09/03/2026, 10:00:01 AM     LOG [InstanceLoader] ConfigModule dependencies initialized
[Nest] 12345  - 09/03/2026, 10:00:01 AM     LOG [InstanceLoader] ThrottlerModule dependencies initialized
...
[Nest] 12345  - 09/03/2026, 10:00:02 AM     LOG [Bootstrap] 🚀 API server running on http://0.0.0.0:4000
[Nest] 12345  - 09/03/2026, 10:00:02 AM     LOG [Bootstrap] 📋 Health check: http://0.0.0.0:4000/api/v1/health
```

**Verify the API is running:**
```bash
curl http://localhost:4000/api/v1/health
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-09-03T10:00:00.000Z",
    "uptime": 12.345,
    "services": {
      "api": "up",
      "database": "connected"
    }
  }
}
```

---

## Step 10: Run the Booking Flow Integration Test ⭐

Open **another new terminal** and run:

```bash
pnpm test:booking
```

**Expected output:**
```
═══════════════════════════════════════════════════════
  Booking Flow Integration Test (HTTP API)
═══════════════════════════════════════════════════════

Health Check
  ✅ API is healthy

Step 1: Register a host
  ✅ Host registered: host-123@test.local

Step 2: Create a property
  ✅ Property created: Mountain View Test Homestay (prop-456)

Step 3: Create rooms
  ✅ Room 1: Deluxe Mountain Room (₹3500/night)
  ✅ Room 2: Standard Room (₹2000/night)

Step 4: Search for available rooms
  ✅ Found 1 properties with available rooms
  ✅ First result: Mountain View Test Homestay — 2 rooms available

Step 5: Create Booking A (Oct 15-18)
  ✅ Booking A created: booking-789
  ✅ Status: PENDING (soft-hold)
  ✅ Total: ₹10500 (3 nights)
  ✅ Hold expires: 10 minutes from now

Step 6: Attempt overlapping Booking B (Oct 16-19) — should FAIL
  ✅ Overlapping booking correctly REJECTED!
  ✅ Error: This room is not available for the selected dates.

Step 7: Adjacent booking (Oct 18-20) — should succeed
  ✅ Adjacent booking created: booking-abc

Step 8: Same dates on Room 2 — should succeed
  ✅ Different room, same dates: booking-def

Step 9: Confirm Booking A
  ✅ Booking confirmed: status=CONFIRMED

Step 10: Cancel Booking A, then book same dates
  ✅ Booking cancelled: status=CANCELLED
  ✅ After cancellation, same dates re-booked: booking-ghi

Step 11: Host views all bookings
  ✅ Host sees 5 bookings

Summary

  Passed: 15
  Failed: 0

  🎉 ALL TESTS PASSED!
```

---

## Step 11: Start the Frontend

Open **another new terminal** and run:

```bash
pnpm dev:web
```

**Expected output:**
```
> @hbs/web@0.1.0 dev
> next dev --port 3000

  ▲ Next.js 15.1.0
  - Local:        http://localhost:3000
  - Environments: .env

 ✓ Starting...
 ✓ Ready in 3.2s
```

---

## Step 12: Manual Testing via Browser

Open your browser and test the full flow:

### Host Flow

1. **Register a host account:**
   ```bash
   curl -X POST http://localhost:4000/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "Test1234!",
       "name": "Test Host",
       "businessName": "Test Homestay"
     }'
   ```

2. **Visit the host dashboard:**
   ```
   http://localhost:3000/host/properties
   ```

3. **Create a property:**
   - Click "+ Add Property"
   - Fill in the form
   - Submit

4. **Add rooms:**
   - Click on your property
   - Click "+ Add Room"
   - Set pricing and amenities
   - Submit

### Guest Flow

1. **Search for properties:**
   ```
   http://localhost:3000/search?city=Manali&checkIn=2026-11-10&checkOut=2026-11-13&guests=2
   ```

2. **Click on a property** to view details

3. **Book a room:**
   - Select dates
   - Fill guest details
   - Submit → creates soft-hold booking

4. **View confirmation page**

### Test Double-Booking Manually

1. **Create Booking A:**
   - Room: Deluxe Mountain Room
   - Dates: Oct 15-18
   - Submit → succeeds

2. **Attempt Booking B (overlapping):**
   - Room: Same Deluxe Mountain Room
   - Dates: Oct 16-19
   - Submit → **should fail with "Room not available"**

3. ✅ **EXCLUDE constraint working!**

---

## Step 13: View Database in Prisma Studio (Optional)

```bash
pnpm db:studio
```

Opens a web UI at `http://localhost:5555` where you can:
- View all tables
- Browse bookings
- Verify the EXCLUDE constraint is working
- Edit data directly

---

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Kill process on port 4000
lsof -ti:4000 | xargs kill -9
```

### Docker Compose Fails

```bash
# Stop and remove containers
docker compose down -v

# Restart
docker compose up -d
```

### Database Connection Failed

```bash
# Check if Postgres is running
docker compose ps

# Check logs
docker compose logs postgres

# Test connection manually
psql postgresql://postgres:postgres@localhost:5432/hotel_booking_dev
```

### Prisma Client Not Found

```bash
pnpm db:generate
```

### Tests Fail

```bash
# Reset database and re-run
docker compose down -v
docker compose up -d
pnpm db:push
pnpm test:exclude
```

---

## Quick Reference

```bash
# Start everything
docker compose up -d
pnpm dev:api    # Terminal 1
pnpm dev:web    # Terminal 2
cd apps/realtime && go run .  # Terminal 3

# Run tests
pnpm test:exclude  # Database-level EXCLUDE constraint test
pnpm test:booking  # HTTP API booking flow test

# Database commands
pnpm db:generate   # Generate Prisma client
pnpm db:push       # Push schema to database
pnpm db:seed       # Seed demo data
pnpm db:studio     # Open Prisma Studio

# Stop everything
docker compose down
```

---

## What to Look For

### EXCLUDE Constraint Test (`pnpm test:exclude`)
- ✅ All 7 tests pass
- ✅ Test 2: Overlapping booking rejected
- ✅ Test 6: Concurrent inserts — exactly 1 of 5 succeeds

### Booking Flow Test (`pnpm test:booking`)
- ✅ All 15 steps pass
- ✅ Step 6: Overlapping booking returns 409 Conflict
- ✅ Step 10: After cancellation, same dates can be re-booked

### Manual Testing
- ✅ Host can create properties and rooms
- ✅ Guest can search and book
- ✅ Overlapping bookings are rejected
- ✅ Cancelled bookings release dates

---

**Phase 1 is complete. The hard part works. Double-bookings are structurally impossible.** 🎉
