# Phase 2 Complete: Payments + State Machine + Idempotent Webhooks ✅

## What Was Built

Phase 2 implements the complete payment lifecycle with PhonePe UPI integration, a centralized state machine, and an idempotent webhook handler that's safe under concurrent delivery.

---

## 1. Booking State Machine (`apps/api/src/common/booking-state.ts`)

**Single source of truth** for all booking status transitions. No inline conditionals anywhere else in the codebase.

### Valid Transitions

```
PENDING ──────► CONFIRMED ──────► PAID ──────► CHECKED_IN ──────► CHECKED_OUT
   │                │                │               │
   │                │                │               │
   ▼                ▼                ▼               ▼
CANCELLED ◄──── CANCELLED ◄──── CANCELLED ◄──── CANCELLED
   ▲
   │
EXPIRED (hold timer ran out)
```

### API

```typescript
import { canTransition, assertCanTransition, getValidTransitions, isTerminal } from './booking-state';

// Check if a transition is valid (pure function)
canTransition('PENDING', 'CONFIRMED');  // true
canTransition('PENDING', 'CHECKED_IN'); // false — skips payment!

// Assert transition or throw BadRequestException
assertCanTransition('PENDING', 'CHECKED_IN'); // throws!

// Get all valid targets from a state
getValidTransitions('PENDING'); // ['CONFIRMED', 'CANCELLED', 'EXPIRED']

// Check if terminal (no further transitions)
isTerminal('CHECKED_OUT'); // true
isTerminal('PAID');        // false
```

### Why This Matters

Before: status changes were scattered across `confirm()`, `cancel()`, and inline `if` statements. Easy to accidentally allow `PENDING → CHECKED_IN` (skipping payment entirely).

After: Every status change in the codebase calls `assertCanTransition()` first. Invalid transitions throw before touching the database.

---

## 2. PhonePe Integration (`apps/api/src/payments/phonepe.service.ts`)

### Sandbox Mode

When `PHONEPE_MERCHANT_ID` is not set, the service runs in sandbox mode:
- Returns mock redirect URLs
- Simulates successful payment verification
- Accepts all webhook signatures
- Full flow testable without real PhonePe credentials

### Production Mode

With credentials configured:
- Real PhonePe API calls with SHA256 checksum verification
- Standard UPI payment flow via redirect
- Webhook signature validation

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/payments/initiate` | Start payment, get redirect URL |
| GET | `/api/v1/payments/verify/:paymentId` | Check payment after redirect |
| POST | `/api/v1/payments/webhook/phonepe` | PhonePe webhook handler |
| POST | `/api/v1/payments/transition` | Admin state transition (JWT auth) |

---

## 3. Payment Flow

```
Guest creates booking
        │
        ▼
   ┌─────────┐
   │ PENDING  │ ← hold_expires_at = now + 10 min
   └────┬────┘
        │
        │ POST /payments/initiate
        │ Creates Payment (INITIATED)
        │ State machine: PENDING → CONFIRMED
        ▼
   ┌──────────┐
   │CONFIRMED │ ← PhonePe redirect URL returned
   └────┬─────┘
        │
        │ Guest pays via UPI
        │ PhonePe sends webhook
        │
        │ Webhook handler:
        │   1. Look up payment by provider_txn_id
        │   2. If already SUCCESS → return 200, do nothing
        │   3. If INITIATED → process transition
        │   4. Payment: INITIATED → SUCCESS
        │   5. Booking: CONFIRMED → PAID
        ▼
   ┌─────────┐
   │  PAID   │ ← Booking is confirmed & paid
   └────┬────┘
        │
        │ Guest arrives at hotel
        │ Host marks CHECKED_IN
        ▼
   ┌────────────┐
   │ CHECKED_IN │
   └────┬───────┘
        │
        │ Guest departs
        ▼
   ┌─────────────┐
   │ CHECKED_OUT │ ← Terminal state
   └─────────────┘
```

---

## 4. Idempotent Webhook Handler — The Critical Piece

This is the function that **must** be correct on the first pass. PhonePe can (and will) deliver the same webhook multiple times.

### The Strategy

```
Webhook arrives with transactionId = "HBS-123"
        │
        ▼
┌──────────────────────────┐
│ 1. Look up payment by     │
│    provider_txn_id        │
│    (UNIQUE constraint)    │
└──────────┬───────────────┘
           │
    ┌──────▼──────┐
    │ Found?       │──No──► Return 200, log warning
    └──────┬──────┘
           │ Yes
    ┌──────▼──────────────┐
    │ 2. status == SUCCESS?│──Yes──► Return 200, "already processed"
    └──────┬──────────────┘         (NO booking update, NO side effects)
           │ No
    ┌──────▼──────────────┐
    │ 3. status == FAILED? │──Yes──► Return 200, "already failed"
    └──────┬──────────────┘
           │ No (status == INITIATED)
    ┌──────▼──────────────────────────────┐
    │ 4. INSIDE DATABASE TRANSACTION:     │
    │    a. Re-fetch payment              │
    │    b. Verify still INITIATED        │
    │       (concurrent request check)    │
    │    c. Payment → SUCCESS             │
    │    d. Booking → PAID                │
    │    e. Commit transaction            │
    └─────────────────────────────────────┘
```

### Why This Is Safe Under Concurrency

1. **UNIQUE constraint on `provider_txn_id`** — Only one payment record per transaction
2. **Check-then-act** — We check status BEFORE processing
3. **Database transaction** — The re-fetch inside `$transaction` catches concurrent modifications
4. **ConflictException** — If two requests race, one gets a conflict and returns "already processed"

Even if 10 identical webhooks arrive simultaneously:
- All 10 look up the same payment record
- Only the first one sees `status = INITIATED`
- That one processes inside a `$transaction`
- The other 9 either see `SUCCESS` (already processed) or get a `ConflictException`
- **Result: exactly 1 state transition, 0 duplicate payments**

---

## 5. Verification Test (`apps/api/test/phase2-payments.test.ts`)

### What It Tests

1. ✅ Create booking → PENDING
2. ✅ Initiate payment → PENDING → CONFIRMED
3. ✅ Webhook (SUCCESS) → CONFIRMED → PAID
4. ✅ **Same webhook AGAIN** → idempotent no-op, booking stays PAID
5. ✅ **5 concurrent duplicate webhooks** → all 5 ignored
6. ✅ No duplicate payment records
7. ✅ **Invalid transition PENDING → CHECKED_IN** → rejected by state machine
8. ✅ **Invalid transition PENDING → PAID** → rejected (skips CONFIRMED)
9. ✅ Valid transition PENDING → CANCELLED → succeeds
10. ✅ Full lifecycle: PAID → CHECKED_IN → CHECKED_OUT
11. ✅ Terminal state CHECKED_OUT → anything → rejected

### Run It

```bash
# Terminal 1: Start the API server
pnpm dev:api

# Terminal 2: Run the test
pnpm test:phase2
```

---

## Files Changed

### New Files
- `apps/api/src/common/booking-state.ts` — State machine (single source of truth)
- `apps/api/src/payments/phonepe.service.ts` — PhonePe API integration
- `apps/api/src/payments/payments.service.ts` — Payment lifecycle + idempotent webhook
- `apps/api/src/payments/payments.controller.ts` — HTTP endpoints
- `apps/api/src/payments/payments.module.ts` — NestJS module
- `apps/api/test/phase2-payments.test.ts` — Verification test

### Modified Files
- `apps/api/src/bookings/bookings.service.ts` — Now uses `assertCanTransition()` everywhere
- `apps/api/src/app.module.ts` — Registers `PaymentsModule`
- `package.json` — Added `test:phase2` script

---

## Decision: Fail-Fast on Payment Failure

When a payment fails, the booking transitions `CONFIRMED → CANCELLED` immediately rather than staying in CONFIRMED and waiting for the hold timer to expire.

**Why:** The guest has already left the payment page. Keeping the booking in CONFIRMED just wastes the room hold for up to 10 more minutes. Failing fast releases the dates immediately so another guest can book them.

---

## What's Next (Phase 3)

- Real-time availability updates via Go WebSocket service
- Redis pub/sub bridge between NestJS and Go
- GSAP scroll animations on marketing pages
- Spline 3D hero section
- Email notifications (Resend)
- Host dashboard with booking calendar view
