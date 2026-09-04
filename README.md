# Hotel Booking SaaS

> Booking + UPI payments platform for independent hotels and homestays in India.

## Architecture

```
                 ┌─────────────────────────┐
                 │   Next.js 15 Frontend    │
                 │  (App Router, TS, Tailwind)
                 │  - Marketing pages (GSAP,
                 │    Spline 3D, Lenis scroll)
                 │  - Booking flow (fast, low-animation)
                 └───────────┬─────────────┘
                             │ REST
                 ┌───────────▼─────────────┐
                 │   NestJS API Gateway     │
                 │  (auth, CRUD, orchestration)
                 └───────────┬─────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
   ┌──────────▼───┐  ┌───────▼──────┐  ┌────▼─────┐
   │  PostgreSQL   │  │  Redis       │  │ PhonePe  │
   │  (Neon/       │  │  (Upstash)   │  │ PG API   │
   │  Supabase)    │  │  cache+pubsub│  │          │
   └──────────┬───┘  └───────┬──────┘  └──────────┘
              │              │
              │      ┌───────▼──────────┐
              │      │  Go WebSocket Svc │
              └─────►│  (live availability)
                     └───────────────────┘
```

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind CSS | SEO, server rendering, type safety |
| Scroll Animation | GSAP + ScrollTrigger | 100% free since 2025, industry standard |
| Smooth Scroll | Lenis | Pairs with GSAP, MIT licensed |
| Micro-interactions | Framer Motion | Best for React component animation |
| 3D | Spline | Visual 3D builder, generous free tier |
| Backend | NestJS + Prisma | Type-safe queries, painless migrations |
| Database | PostgreSQL | EXCLUDE constraint prevents double-bookings at DB level |
| Cache/Pub-sub | Redis (Upstash) | Availability cache, bridges NestJS and Go |
| Real-time | Go + WebSockets | Efficient concurrent connections |
| Payments | PhonePe PG API | UPI checkout |
| File Storage | Cloudflare R2 | Free egress |
| Email | Resend | Booking confirmations |
| Deploy | Vercel + Railway/Render | Free tiers, GitHub Actions CI/CD |

## Monorepo Structure

```
.
├── apps/
│   ├── web/              # Next.js 15 frontend
│   ├── api/              # NestJS backend API
│   └── realtime/         # Go WebSocket service
├── packages/
│   ├── prisma/           # Shared Prisma schema + client
│   └── shared/           # Shared types and utilities
├── docker-compose.yml    # Local Postgres + Redis
├── pnpm-workspace.yaml   # Monorepo config
└── .github/workflows/    # CI/CD pipeline
```

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 9 (`npm install -g pnpm`)
- Go >= 1.22 (for the realtime service)
- Docker (for local Postgres + Redis)

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Start local Postgres + Redis
docker compose up -d

# 3. Copy environment variables
cp .env.example .env
# Edit .env with your local config

# 4. Generate Prisma client
pnpm db:generate

# 5. Push schema to local database
pnpm db:push

# 6. (Optional) Seed demo data
pnpm db:seed

# 7. Start development servers
pnpm dev:api    # NestJS API on http://localhost:4000
pnpm dev:web    # Next.js on http://localhost:3000

# In a separate terminal:
cd apps/realtime && go run .   # WebSocket service on ws://localhost:4001
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `REDIS_URL` | Redis connection string | Required |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_REFRESH_SECRET` | Refresh token secret | Required |
| `PHONEPE_MERCHANT_ID` | PhonePe merchant ID | For payments |
| `PHONEPE_SALT_KEY` | PhonePe salt key | For payments |
| `R2_ACCOUNT_ID` | Cloudflare R2 account | For file storage |
| `RESEND_API_KEY` | Resend API key | For emails |

## The Critical Piece: Double-Booking Prevention

The `bookings` table has a database-level `EXCLUDE` constraint that makes overlapping active bookings structurally impossible:

```sql
CONSTRAINT no_overlapping_bookings
    EXCLUDE USING gist (
        room_id WITH =,
        daterange(check_in, check_out) WITH &&
    ) WHERE (status IN ('PENDING', 'CONFIRMED', 'PAID', 'CHECKED_IN'))
```

This means:
- **No application-level race condition** can create a double-booking
- The database **rejects the second insert outright**
- Cancelled/expired bookings don't block new reservations
- The soft-hold pattern (`PENDING` + `hold_expires_at`) implements 10-minute checkout locks

## API Endpoints

### Health
- `GET /api/v1/health` — Service health check

### Auth
- `POST /api/v1/auth/register` — Create host account
- `POST /api/v1/auth/login` — Login and get tokens
- `POST /api/v1/auth/refresh` — Refresh access token
- `POST /api/v1/auth/logout` — Revoke refresh tokens (requires auth)
- `POST /api/v1/auth/me` — Get current user (requires auth)

### Coming Soon
- Properties CRUD
- Room management
- Booking creation with soft-hold
- PhonePe payment integration
- Availability calendar
- Guest management

## Development

```bash
# Run all services
pnpm dev

# Run specific service
pnpm dev:api
pnpm dev:web

# Database operations
pnpm db:generate    # Generate Prisma client
pnpm db:push        # Push schema changes
pnpm db:migrate     # Create migration
pnpm db:studio      # Open Prisma Studio
pnpm db:seed        # Seed demo data

# Testing
pnpm test           # Run all tests
pnpm lint           # Lint all packages

# Build
pnpm build          # Build all packages
```

## Deployment

### Frontend (Vercel)
1. Connect GitHub repo to Vercel
2. Set root directory to `apps/web`
3. Configure environment variables
4. Deploy

### Backend (Railway/Render)
1. Connect GitHub repo
2. Set root directory to `apps/api`
3. Build command: `pnpm install && pnpm build:api`
4. Start command: `pnpm start`
5. Configure environment variables

### Realtime Service (Railway/Render)
1. Connect GitHub repo
2. Set root directory to `apps/realtime`
3. Use the included Dockerfile
4. Configure environment variables

### Database (Neon/Supabase)
1. Create free-tier PostgreSQL instance
2. Run migrations: `pnpm db:migrate:deploy`
3. Copy connection string to app environment variables

## Roadmap

- [x] **Phase 0** — Foundation (monorepo, schema, auth, deploy pipeline)
- [ ] **Phase 1** — Core booking flow (property/room CRUD, availability, soft-hold)
- [ ] **Phase 2** — Payments (PhonePe UPI integration, webhook handling)
- [ ] **Phase 3** — Real-time (Go WebSocket service, live availability)
- [ ] **Phase 4** — Host dashboard (property management, booking management)
- [ ] **Phase 5** — Guest experience (search, booking, payment, confirmation)
- [ ] **Phase 6** — Polish (GSAP animations, Spline 3D, email notifications)

## License

Private — all rights reserved.

## Contact

Built by Aakash — [GitHub](https://github.com/aakash8930)
