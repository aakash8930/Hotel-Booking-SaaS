# Hotel Booking SaaS — Full Project Details

> Generated from the current codebase (branch `arena/01a06d0e-hotel-booking-saas`,
> latest commit `dc63551 phase6`). This document is the single source of truth for
> the project's current state, structure, and how the admin side works.

---

## 1. Project Overview

**Hotel Booking SaaS** is a booking + UPI payments platform for independent hotels
and homestays in India. It is a **pnpm monorepo** containing:

| App / Package | What it is |
|---|---|
| `apps/web` | Next.js 15 frontend (App Router, TypeScript, Tailwind) |
| `apps/api` | NestJS backend API (REST, JWT auth, business logic) |
| `apps/realtime` | Go WebSocket service (live availability via Redis pub/sub) |
| `packages/prisma` | Shared Prisma schema, migrations, seed, and client |
| `packages/shared` | Shared TypeScript types/constants (`@hbs/shared`) |

**Core goals of the product:**

1. Guests discover and book hotels/homestays in India.
2. Hosts list properties/rooms and manage bookings.
3. Payments via **PhonePe UPI** gateway.
4. Platform admins moderate hosts, properties, reviews, bookings, and payouts.
5. No double-booking — guaranteed at the **database level**.

---

## 2. Architecture

```
                 ┌──────────────────────────────┐
                 │   Next.js 15 Frontend        │
                 │   (App Router, TS, Tailwind) │
                 │   - Marketing pages (GSAP,   │
                 │     Spline 3D, Lenis scroll) │
                 │   - Guest booking flow       │
                 │   - Host dashboard           │
                 │   - Admin console            │
                 └──────────────┬───────────────┘
                                │ REST (/api/v1, CORS)
                 ┌──────────────▼───────────────┐
                 │   NestJS API Gateway (4000)   │
                 │   auth, CRUD, orchestration   │
                 └──────────────┬───────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
 ┌────────▼────────┐   ┌───────▼────────┐   ┌─────────▼─────────┐
 │  PostgreSQL     │   │  Redis         │   │  PhonePe PG API   │
 │  (Neon/Supabase)│   │  (Upstash)     │   │  (UPI checkout)   │
 │  - EXCLUDE      │   │  - cache       │   │                   │
 │    constraint   │   │  - pub/sub     │   │                   │
 └────────┬────────┘   └───────┬────────┘   └───────────────────┘
          │                    │
          │          ┌─────────▼──────────┐
          └─────────►│ Go WebSocket (4001) │  live availability
                     └────────────────────┘
```

**Data flow:**

- Browser ↔ Next.js (SSR + client) ↔ NestJS REST API ↔ Prisma ↔ PostgreSQL
- NestJS publishes booking events → Redis pub/sub → Go service → WebSocket push to browsers
- PhonePe webhooks → NestJS payments service → booking marked `PAID`
- Cron (NestJS `@nestjs/schedule`) → expire stale booking holds every minute

---

## 3. Tech Stack

| Layer | Choice | Why / notes |
|---|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind CSS | SEO, SSR, type safety |
| Animation | GSAP + ScrollTrigger, Lenis, Framer Motion, Spline 3D | free / MIT, premium feel |
| Backend | NestJS 10 + Prisma | typed queries, DI, structured modules |
| Database | PostgreSQL | `EXCLUDE` constraint prevents double-bookings at DB level |
| Cache/Pub-sub | Redis (Upstash) | availability cache + bridge to Go service |
| Real-time | Go + gorilla/websocket | thousands of concurrent sockets |
| Payments | PhonePe PG API | UPI intent + webhook verification; mock mode without credentials |
| Storage | Cloudflare R2 | pre-signed upload URLs |
| Email/WhatsApp | Resend / Meta Cloud API | booking confirmations |
| AI | Gemini API | property description generation + FAQ chat |
| Observability | Sentry (API + web), PostHog (web) | optional via env vars |
| Deploy | Vercel (web) + Railway/Render (API, realtime) + Neon/Supabase (DB) | GitHub Actions CI |

---

## 4. Monorepo Structure (full)

```
Hotel-Booking-SaaS/
├── apps/
│   ├── api/                              # NestJS API — port 4000, prefix /api/v1
│   │   ├── src/
│   │   │   ├── auth/                     # Host, Guest, Admin authentication
│   │   │   │   ├── dto/                  # login/register/refresh/submit-verification DTOs
│   │   │   │   ├── guards/               # jwt-auth.guard, guest-auth.guard, admin-auth.guard
│   │   │   │   ├── strategies/           # jwt.strategy.ts (role-scoped Payload)
│   │   │   │   ├── auth.controller.ts    # /auth (host)
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── guest-auth.controller.ts   # /auth/guest
│   │   │   │   ├── guest-auth.service.ts
│   │   │   │   ├── admin-auth.controller.ts   # /auth/admin
│   │   │   │   └── admin-auth.service.ts
│   │   │   ├── admin/                    # Platform admin module
│   │   │   │   ├── admin.controller.ts   # /admin (guarded by AdminAuthGuard)
│   │   │   │   ├── admin.service.ts
│   │   │   │   └── admin.module.ts
│   │   │   ├── properties/               # Property CRUD + public slug lookup
│   │   │   ├── rooms/                    # Room CRUD, availability, pricing
│   │   │   ├── bookings/                 # Soft-hold booking, confirm/cancel, cron cleanup
│   │   │   ├── search/                   # City/date/guest search
│   │   │   ├── reviews/                  # Reviews, reports, host replies
│   │   │   ├── payments/                 # PhonePe UPI + webhooks + email/WhatsApp
│   │   │   ├── payouts/                  # Host payout batches (race-safe)
│   │   │   ├── billing/                  # Billing plan + GSTIN
│   │   │   ├── invoices/                 # GST invoice generation
│   │   │   ├── upload/                   # Cloudflare R2 pre-signed URLs
│   │   │   ├── ai/                       # Gemini descriptions + FAQ
│   │   │   ├── realtime/                 # Redis pub/sub publisher
│   │   │   ├── health/                   # Health check
│   │   │   ├── common/
│   │   │   │   ├── booking-state.ts      # Booking state machine (single source of truth)
│   │   │   │   ├── cancellation-policy.ts
│   │   │   │   ├── decorators/           # current-user, prisma
│   │   │   │   ├── filters/              # global exception filter
│   │   │   │   └── sentry.ts
│   │   │   ├── app.module.ts
│   │   │   └── main.ts                   # bootstrap: validation, CORS, prefix, throttler
│   │   └── test/                         # integration/DB tests (see §9)
│   ├── web/                              # Next.js 15 — port 3000
│   │   ├── src/
│   │   │   ├── app/                      # Page routes (see §7)
│   │   │   ├── components/
│   │   │   │   ├── admin/                # admin-nav, require-admin
│   │   │   │   ├── animations/           # smooth-scroll
│   │   │   │   ├── host/                 # require-host, gstin-card, verification-card
│   │   │   │   ├── layout/               # header, footer, hero, features, 3D scenes, search-cta
│   │   │   │   ├── legal/                # legal-page wrapper
│   │   │   │   ├── property/             # star-rating, reviews-section, faq-chat, property-map
│   │   │   │   └── ui/                   # button, card, input, badge, section
│   │   │   └── lib/
│   │   │       ├── api.ts                # ApiClient + `api` / `guestApi` / `adminApi`
│   │   │       ├── admin-session.ts      # admin profile in localStorage
│   │   │       ├── host-session.ts
│   │   │       ├── guest-session.ts
│   │   │       └── use-availability.ts
│   │   ├── instrumentation.ts / instrumentation-client.ts   # Sentry
│   │   ├── next.config.js               # rewrites proxy + allowedDevOrigins *.e2b.app
│   │   └── tailwind.config.js / postcss.config.js
│   └── realtime/                         # Go WebSocket — port 4001
│       ├── main.go                       # hub, client, targeted broadcast
│       ├── redis.go                      # Redis pub/sub subscriber
│       ├── Dockerfile
│       └── go.mod / go.sum
├── packages/
│   ├── prisma/
│   │   ├── prisma/
│   │   │   ├── schema.prisma             # all models + enums
│   │   │   ├── seed.ts
│   │   │   └── migrations/               # raw SQL incl. EXCLUDE constraint
│   │   └── src/index.ts                  # Prisma client singleton
│   └── shared/src/index.ts               # domain types, ApiResponse, etc.
├── scripts/
│   ├── create-admin.ts                   # ⭐ ONLY way to create an admin account
│   └── fix-exclude-constraint.ts
├── docs/
│   └── ci/ci.yml
├── .github/workflows/ci.yml
├── docker-compose.yml                    # local Postgres + Redis
├── Makefile
├── .env.example / .env.local.example
├── README.md / SETUP.md / PHASE1_COMPLETE.md / PHASE2.md / PROJECT_STRUCTURE.md
└── package.json / pnpm-workspace.yaml / tsconfig.base.json
```

---

## 5. Database Schema

**Location:** `packages/prisma/prisma/schema.prisma`

### Enums

| Enum | Values |
|---|---|
| `UserRole` | `HOST`, `GUEST`, `ADMIN` |
| `BookingStatus` | `PENDING`, `CONFIRMED`, `PAID`, `CHECKED_IN`, `CHECKED_OUT`, `CANCELLED`, `EXPIRED` |
| `PaymentStatus` | `PENDING`, `SUCCESS`, `FAILED`, `REFUNDED` |
| `PaymentMethod` | `UPI`, `CARD`, `NETBANKING`, `WALLET` |
| `PayoutStatus` | `PENDING`, `PAID` |
| `PropertyStatus` | `DRAFT`, `ACTIVE`, `SUSPENDED` |
| `BillingPlan` | `COMMISSION`, `SUBSCRIPTION` |
| `CancellationPolicy` | `FLEXIBLE`, `MODERATE`, `STRICT` |
| `VerificationStatus` | `UNVERIFIED`, `PENDING`, `VERIFIED`, `REJECTED` |

### Models

| Model | Purpose / key fields |
|---|---|
| `Host` | Property owner — email, passwordHash, businessName, phone, isActive, `billingPlan`, `commissionRate`, `verificationStatus/Note`, `verifiedAt` |
| `Guest` | Booking customer — email, passwordHash, name, phone, report-verified flag |
| `Admin` | ⭐ Platform operator — email, passwordHash, name (see §10) |
| `RefreshToken` / `GuestRefreshToken` / `AdminRefreshToken` | Hashed, revocable refresh tokens per role |
| `Property` | name, slug, city, state, description, status, host relation |
| `Room` | name, description, basePrice, capacity, amenities, active, property relation |
| `Booking` | guestId, roomId, checkIn, checkOut, guests, status, totalPrice, `holdExpiresAt`, payoutId |
| `Review` | rating, comment, reportCount, hiddenAt/hiddenReason, guest + property relation |
| `Payment` | bookingId, amount, status, method, provider transaction refs |
| `Invoice` / `InvoiceSequence` | GST invoices + per-year sequence counters |
| `Payout` | hostId, grossAmount, platformFee, netPayable, status, paidAt, payoutReference |

### ⭐ The critical constraint: no double-booking

Applied via raw SQL in the migration (Prisma can't declare `EXCLUDE` natively):

```sql
CONSTRAINT no_overlapping_bookings
    EXCLUDE USING gist (
        room_id WITH =,
        daterange(check_in, check_out) WITH &&
    ) WHERE (status IN ('PENDING', 'CONFIRMED', 'PAID', 'CHECKED_IN'))
```

Consequences:

- Overlapping active bookings are **impossible at the database level** — no app-level race can double-book.
- The second overlapping insert is **rejected outright** (constraint violation → 409).
- Cancelled / expired bookings do not block new reservations.
- `PENDING` + `hold_expires_at` implements a **10-minute soft-hold** on checkout.

---

## 6. Backend Modules & API Surface

All endpoints are under **`/api/v1`**, respond as `{ success, data | error }`, and run
through global validation + exception filter + rate limiting (60 req/min default).

### 6.1 Auth

**Host** (`apps/api/src/auth/`):
- `POST /auth/register` — create host account
- `POST /auth/login` — login, get JWT pair
- `POST /auth/refresh` — rotate refresh token
- `POST /auth/logout` — revoke refresh tokens (host JWT)
- `POST /auth/me` — current host identity (host JWT)
- `POST /auth/host/verification` — submit verification
- `GET /auth/host/verification` — verification status

**Guest** (`guest-auth.controller.ts`):
- `POST /auth/guest/register`, `POST /auth/guest/login`, `POST /auth/guest/refresh`,
  `POST /auth/guest/logout`, `POST /auth/guest/me`

**Admin** — see §10.

### 6.2 Properties (`/host/properties…`, public `properties/:slug`)

- `POST /host/properties` — create (host)
- `GET /host/properties` — list own (host)
- `GET /host/properties/:id` — detail (host)
- `PUT /host/properties/:id` — update (host)
- `DELETE /host/properties/:id` — suspend (host)
- `GET /properties/:slug` — public listing by slug

### 6.3 Rooms (`/host/properties/:propertyId/rooms`)

- `POST` / `GET` / `GET :roomId` / `PUT :roomId` / `DELETE :roomId`
- `GET :roomId/availability` — date-range availability
- `GET :roomId/bookings` — booking history

### 6.4 Bookings

- `POST /bookings` — create with soft-hold (guest / optional guest)
- `GET /guest/bookings` — guest's trips
- `GET /bookings/:id` — detail
- `POST /bookings/:id/confirm` — confirm (payment initiated)
- `GET /bookings/:id/cancellation-preview` — refund preview
- `POST /bookings/:id/cancel` — cancel / release dates
- `GET /host/bookings`, `GET /host/properties/:propertyId/bookings` — host views
- `GET /host/analytics` — host analytics
- `POST /host/bookings/cleanup-expired` — manual cleanup
- `@Cron(EVERY_MINUTE)` — auto-expire stale holds

### 6.5 Search

- `GET /search?city=&checkIn=&checkOut=&guests=` — available properties w/ lowest price

### 6.6 Reviews

- `POST /reviews` — create (guest)
- `GET /reviews/property/:propertyId` — public list
- `POST /reviews/:id/report` — report (auto-hide above threshold, pending admin review)
- `POST /reviews/:id/reply` — host reply

### 6.7 Payments (PhonePe)

- `POST /payments/initiate` — create UPI intent, returns redirect URL
- `GET /payments/verify/:paymentId` — poll status
- `POST /payments/webhook/phonepe` — signature-verified webhook → `PAID`
- `POST /payments/transition` — guarded state-machine transitions (host/guest/admin)
- Mock mode: if `PHONEPE_MERCHANT_ID` is unset, returns mock responses for local dev.

### 6.8 Payouts

- `GET /host/payouts/balance` — eligible bookings, gross, fee, net
- `POST /host/payouts` — create `PENDING` batch (SERIALIZABLE tx, race-safe)
- `GET /host/payouts` — list own
- Fee = host `commissionRate` on `COMMISSION` plan, 0% on `SUBSCRIPTION`.

### 6.9 Billing / Invoices / Upload / AI / Health

- `GET|PUT /host/billing`, `PUT /host/billing/gstin`
- `GET /bookings/:id/invoice` — GST invoice PDF/data
- `POST /upload/url` — R2 pre-signed upload URL
- `POST /ai/property-description`, `POST /ai/faq` — Gemini
- `GET /health` — service health

---

## 7. Frontend Pages (`apps/web/src/app`)

| Area | Routes |
|---|---|
| Marketing | `/` (hero, 3D showcase, features, journey story) |
| Discover | `/search`, `/property/[slug]` (reviews, FAQ chat, map) |
| Booking | `/booking/[id]`, `/booking/[id]/confirm`, `/booking/[id]/invoice`, `/booking/[id]/payment-callback` |
| Guest account | `/account/login`, `/account/register`, `/account/trips` |
| Host dashboard | `/host/login`, `/host/register`, `/host/properties`, `/host/properties/new`, `/host/properties/[id]`, `/host/bookings`, `/host/billing` |
| **Admin console** | `/admin/login`, `/admin`, `/admin/hosts`, `/admin/properties`, `/admin/reviews`, `/admin/bookings`, `/admin/payouts` |
| Legal | `/legal/terms`, `/legal/privacy`, `/legal/cancellation-refund` |

Host pages are wrapped in `require-host`; admin pages in `require-admin`.

---

## 8. Realtime Service (Go)

`apps/realtime` subscribes to Redis pub/sub channels and broadcasts targeted
messages to WebSocket clients:

```
NestJS API → publishes booking events to Redis → Go service → WS push to browsers
```

- Written in Go with `gorilla/websocket` for high-concurrency connections.
- **Targeted broadcast**: messages carry a `PropertyID`; only clients subscribed to
  that property receive the event (avoids fan-out to every tab).
- Runs on `ws://localhost:4001` in dev.

---

## 9. Tests (`apps/api/test/`)

| Test file | What it proves |
|---|---|
| `exclude-constraint.test.ts` | DB-level EXCLUDE: overlapping rejected, adjacent OK, PENDING blocks, cancelled don't block, 5 concurrent → exactly 1 success |
| `booking-flow.test.ts` | Full HTTP flow: register → create property/rooms → search → book → conflict 409 → confirm → cancel → host sees bookings |
| `concurrency-load.test.ts` | Concurrent booking load behavior |
| `phase2-payments.test.ts` | PhonePe mock initiate/verify/webhook flow |
| `realtime-availability.test.ts` | Redis publish → availability update |
| `payout-race.test.ts` | Concurrent payout generation doesn't double-count (SERIALIZABLE) |

Run: `pnpm test:exclude`, `pnpm test:booking`, `pnpm test:phase2`, `pnpm test:realtime`,
`pnpm test:load`, `pnpm test:payout-race`.

---

## 10. Admin — How It Is Handled & Works

Admin is a **third role** (platform operator), deliberately separate from Host and
Guest: separate DB tables, separate auth endpoints, separate JWT role, separate
frontend session storage, and a separate guarded console.

### 10.1 Data model

```prisma
model Admin {
  id           String   @id @default(uuid()) @db.Uuid
  email        String   @unique
  passwordHash String   @map("password_hash")   // bcrypt, 12 rounds
  name         String
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  refreshTokens AdminRefreshToken[]
  @@map("admins")
}

model AdminRefreshToken {
  id        String    @id @default(uuid()) @db.Uuid
  admin     Admin     @relation(fields: [adminId], references: [id])
  adminId   String    @map("admin_id") @db.Uuid
  tokenHash String    @unique @map("token_hash")   // hashed, never stored raw
  expiresAt DateTime  @map("expires_at")
  revokedAt DateTime? @map("revoked_at")
  @@index([adminId])
  @@map("admin_refresh_tokens")
}
```

### 10.2 Account creation — deliberately closed (no self-signup)

There is **no register endpoint** (deliberate design per schema comment: a named,
logged-in admin replaces the old anonymous shared-secret `AdminKeyGuard`).
Admins are created by whoever controls the deploy environment:

```bash
pnpm create:admin -- --email admin@example.com --name "Ops" --password "Str0ngPass!"
```

`scripts/create-admin.ts`:
- reads `--email`, `--name`, `--password` (min 8 chars),
- bcrypt-hashes (12 rounds),
- `upsert`s on email (create or update password),
- prints the new admin id.

### 10.3 Backend auth endpoints (`/api/v1/auth/admin`)

| Endpoint | Guard | Behavior |
|---|---|---|
| `POST /auth/admin/login` | — (throttled 10/min) | verifies email + bcrypt, issues access+refresh JWT pair |
| `POST /auth/admin/refresh` | — | rotates refresh token (old revoked, new pair issued) |
| `POST /auth/admin/logout` | `AdminAuthGuard` | revokes all active admin refresh tokens |
| `POST /auth/admin/me` | `AdminAuthGuard` | returns `{ id, email }` |

### 10.4 Role-scoped JWT + guard

- `JwtStrategy` decodes `{ sub, email, type, role }`; only `type === 'access'` is accepted.
- **`AdminAuthGuard`** extends Passport's JWT guard and overrides `handleRequest` to
  reject any token where `role !== 'admin'` → host/guest tokens can never reach
  admin endpoints. (Sibling guards do the same for `role === 'host'` / `'guest'`.)
- The whole `AdminController` is decorated `@Controller('admin') @UseGuards(AdminAuthGuard)`.

### 10.5 Admin API endpoints (`/api/v1/admin`)

| Area | Endpoint | Action |
|---|---|---|
| Dashboard | `GET /admin/stats` | revenue, bookings, hosts, guests, active/total properties, pending verifications, pending payouts, reported reviews |
| Hosts | `GET /admin/hosts?verificationStatus=` | list hosts with property counts, filterable |
| | `PUT /admin/hosts/:id/active` | activate / deactivate a host |
| | `PUT /admin/hosts/:id/verification` | `VERIFIED` or `REJECTED` + note, sets `verifiedAt` |
| Properties | `GET /admin/properties?status=` | list all properties with host info, filterable |
| | `PUT /admin/properties/:id/status` | `ACTIVE` / `SUSPENDED` |
| Reviews | `GET /admin/reviews?filter=reported|hidden` | moderation queue |
| | `PUT /admin/reviews/:id/hidden` | hide/unhide + reason |
| Bookings | `GET /admin/bookings?q=` | search by booking UUID, guest name/email, host email |
| | `POST /admin/bookings/:id/transition` | force state change (validated by state machine) |
| Payouts | `GET /admin/payouts` | list all payout batches |
| | `POST /admin/payouts/:id/mark-paid` | mark paid with optional payout reference |

`AdminService` delegates:
- booking transitions → `PaymentsService.transitionBooking` (respects `booking-state.ts`)
- payouts → `PayoutsService.markPaid` / `listAll`

### 10.6 Frontend admin session

- **Isolated API client** in `lib/api.ts`:
  ```ts
  export const adminApi = new ApiClient({
    accessTokenKey: 'admin_access_token',
    refreshTokenKey: 'admin_refresh_token',
    refreshEndpoint: '/auth/admin/refresh',
  });
  ```
  Separate localStorage keys + refresh endpoint so host / guest / admin sessions
  never clobber each other in the same browser. On 401 it auto-refreshes and retries.
- **Session state** (`lib/admin-session.ts`): profile (`id, name, email`) under
  `admin_profile`; `useAdminSession()` hook listens for changes; `clearAdminSession()`
  clears tokens + profile.
- **Route protection** (`components/admin/require-admin.tsx`): wraps every admin page;
  shows a spinner while checking, redirects to `/admin/login?next=<path>` if no session.
- **Login page** (`/admin/login`): calls `POST /auth/admin/login`, stores tokens +
  profile, redirects to `next` or `/admin`. Text explains admins are provisioned by
  the deploy environment, not self-service.
- **Nav** (`components/admin/admin-nav.tsx`): Dashboard / Hosts / Properties /
  Reviews / Bookings / Payouts + sign out.

### 10.7 Admin capabilities (what an admin can do)

1. **Platform oversight** — platform-wide revenue, bookings, host/guest/property counts.
2. **Host governance** — activate/deactivate hosts; approve/reject verification with notes.
3. **Property moderation** — suspend or re-activate listings.
4. **Review moderation** — hide/unhide reported or abusive reviews (auto-hide queue).
5. **Dispute resolution** — search bookings by id/guest/host and drive transitions
   along the legal state-machine edges only.
6. **Money operations** — review and mark host payouts as paid with a reference.

### 10.8 Admin security posture

- No registration API — accounts only via `scripts/create-admin.ts` on the deploy env.
- Passwords hashed with bcrypt (cost 12).
- Refresh tokens stored **hashed** in `AdminRefreshToken`, rotated on use, revocable, 30-day expiry.
- Access tokens carry `role: 'admin'`; `AdminAuthGuard` enforces it server-side.
- Login throttled to 10 attempts/min.
- Separate browser session namespace from host/guest.

---

## 11. Environment Variables (`.env.example`)

| Group | Variables |
|---|---|
| Database | `DATABASE_URL` (required) |
| Redis | `REDIS_URL` (required) |
| Auth | `JWT_SECRET`, `JWT_EXPIRES_IN` (7d), `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN` (30d) |
| Payments | `PHONEPE_MERCHANT_ID`, `PHONEPE_SALT_KEY`, `PHONEPE_SALT_INDEX`, `PHONEPE_BASE_URL`, `PHONEPE_REDIRECT_URL` |
| Storage | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` |
| Email/WhatsApp | `RESEND_API_KEY`, `EMAIL_FROM`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` |
| AI | `GEMINI_API_KEY`, `GEMINI_MODEL` (gemini-2.0-flash) |
| App URLs | `NEXT_PUBLIC_API_URL` (4000), `NEXT_PUBLIC_WS_URL` (4001), `NEXT_PUBLIC_APP_URL` (3000) |
| Observability | `NEXT_PUBLIC_POSTHOG_KEY/HOST`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` |

---

## 12. Local Setup

```bash
# 1. Install
pnpm install

# 2. Local Postgres + Redis
docker compose up -d

# 3. Env
cp .env.example .env   # then fill values

# 4. Prisma
pnpm db:generate
pnpm db:push           # or pnpm db:migrate
pnpm db:seed           # optional demo data

# 5. Run
pnpm dev:api           # NestJS  → http://localhost:4000
pnpm dev:web           # Next.js → http://localhost:3000
pnpm dev:realtime      # Go WS   → ws://localhost:4001

# 6. Create the first admin
pnpm create:admin -- --email admin@example.com --name "Ops" --password "Str0ngPass!"
# login at http://localhost:3000/admin/login
```

---

## 13. Known Documentation Gaps

- `README.md` still lists Properties/Bookings as "Coming Soon" and its roadmap shows
  Phase 1–6 unchecked — the code is well past that (Phase 6 is committed).
- `PROJECT_STRUCTURE.md` doesn't include the Admin module or Phase 2–6 modules
  (payments, payouts, billing, invoices, reviews, ai, realtime).
- This document (`PROJECT_DETAILS.md`) is the up-to-date reference.
