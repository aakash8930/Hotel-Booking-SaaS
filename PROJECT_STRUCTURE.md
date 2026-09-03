# Project Structure

This document explains the monorepo structure and where to find key files.

```
Hotel-Booking-SaaS/
├── apps/                          # Application packages
│   ├── api/                       # NestJS backend API
│   │   ├── src/
│   │   │   ├── auth/             # Authentication module
│   │   │   │   ├── dto/          # Data transfer objects
│   │   │   │   ├── guards/       # JWT auth guards
│   │   │   │   ├── strategies/   # Passport strategies
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.module.ts
│   │   │   │   └── auth.service.ts
│   │   │   ├── common/           # Shared utilities
│   │   │   │   ├── decorators/   # Custom decorators
│   │   │   │   ├── filters/      # Exception filters
│   │   │   │   └── pipes/        # Validation pipes
│   │   │   ├── health/           # Health check module
│   │   │   ├── app.module.ts     # Root module
│   │   │   └── main.ts           # Application entry point
│   │   ├── test/                 # E2E tests
│   │   ├── nest-cli.json         # NestJS CLI config
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── web/                       # Next.js 15 frontend
│   │   ├── src/
│   │   │   ├── app/              # App Router pages
│   │   │   │   ├── booking/      # Booking flow pages
│   │   │   │   ├── host/         # Host dashboard pages
│   │   │   │   ├── globals.css   # Global styles
│   │   │   │   ├── layout.tsx    # Root layout
│   │   │   │   └── page.tsx      # Home page
│   │   │   ├── components/       # React components
│   │   │   │   ├── animations/   # GSAP/Framer Motion
│   │   │   │   ├── layout/       # Layout components
│   │   │   │   └── ui/           # UI primitives
│   │   │   ├── hooks/            # Custom React hooks
│   │   │   └── lib/              # Utilities
│   │   │       └── api.ts        # API client
│   │   ├── public/               # Static assets
│   │   ├── next.config.js        # Next.js config
│   │   ├── tailwind.config.js    # Tailwind config
│   │   ├── postcss.config.js
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── realtime/                  # Go WebSocket service
│       ├── main.go               # Entry point
│       ├── Dockerfile            # Production build
│       ├── go.mod                # Go module definition
│       └── go.sum                # Dependency checksums
│
├── packages/                      # Shared packages
│   ├── prisma/                    # Database schema & client
│   │   ├── prisma/
│   │   │   ├── schema.prisma     # Data model
│   │   │   ├── seed.ts           # Demo data seeder
│   │   │   └── migrations/       # SQL migrations
│   │   │       └── 0001_initial_schema/
│   │   │           └── migration.sql  # EXCLUDE constraint
│   │   ├── src/
│   │   │   └── index.ts          # Prisma client singleton
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── shared/                    # Shared types & utilities
│       ├── src/
│       │   └── index.ts          # Types, constants, utils
│       ├── package.json
│       └── tsconfig.json
│
├── .github/
│   └── workflows/
│       └── ci.yml                 # GitHub Actions CI/CD
│
├── .env.example                   # Environment template
├── .env.local.example             # Local dev template
├── .eslintrc.json                 # ESLint config
├── .prettierrc                    # Prettier config
├── .gitignore                     # Git ignore rules
├── docker-compose.yml             # Local Postgres + Redis
├── Makefile                       # Development commands
├── package.json                   # Root package
├── pnpm-workspace.yaml            # Monorepo config
├── tsconfig.base.json             # Shared TypeScript config
├── README.md                      # Project overview
├── SETUP.md                       # Setup guide
└── CONTRIBUTING.md                # Contribution guide
```

## Key Files

### Database Schema

**Location:** `packages/prisma/prisma/schema.prisma`

Contains all data models:
- `Host` — Property owners
- `Property` — Hotels/homestays
- `Room` — Individual rooms
- `Guest` — Booking customers
- `Booking` — Reservations (with EXCLUDE constraint)
- `Payment` — UPI payments
- `RefreshToken` — JWT refresh tokens

**Critical:** The `no_overlapping_bookings` EXCLUDE constraint is defined in the migration SQL, not the Prisma schema (Prisma doesn't support EXCLUDE natively).

### API Entry Point

**Location:** `apps/api/src/main.ts`

Bootstraps the NestJS application with:
- Global validation pipes
- CORS configuration
- API prefix (`/api/v1`)
- Rate limiting

### Frontend Entry Point

**Location:** `apps/web/src/app/layout.tsx`

Root layout with:
- Google Fonts (Inter + Playfair Display)
- Smooth scroll (Lenis)
- Global metadata

### Authentication

**Location:** `apps/api/src/auth/`

- `auth.service.ts` — Registration, login, token management
- `auth.controller.ts` — REST endpoints
- `strategies/jwt.strategy.ts` — Passport JWT validation
- `guards/jwt-auth.guard.ts` — Route protection

### API Client

**Location:** `apps/web/src/lib/api.ts`

Frontend HTTP client with:
- Automatic token refresh
- Request/response normalization
- Error handling

### Shared Types

**Location:** `packages/shared/src/index.ts`

Domain types used across frontend and backend:
- `Property`, `Room`, `Booking`, `Guest`, `Payment`
- API response types
- Utility functions (formatting, validation)

## Adding New Features

### New API Module

1. Create module directory: `apps/api/src/your-module/`
2. Create files:
   - `your-module.module.ts`
   - `your-module.controller.ts`
   - `your-module.service.ts`
   - `dto/` (if needed)
3. Import in `apps/api/src/app.module.ts`

### New Frontend Page

1. Create file: `apps/web/src/app/your-page/page.tsx`
2. Export default component
3. Next.js handles routing automatically

### New Database Model

1. Add model to `packages/prisma/prisma/schema.prisma`
2. Run `pnpm db:migrate` to create migration
3. Run `pnpm db:generate` to update client
4. Use in services via `@InjectPrisma()`

### New Shared Type

1. Add type to `packages/shared/src/index.ts`
2. Import in frontend/backend: `import { YourType } from '@hbs/shared'`

## Build Outputs

- **API:** `apps/api/dist/` — Compiled NestJS
- **Web:** `apps/web/.next/` — Next.js build
- **Realtime:** `apps/realtime/bin/` — Go binary
- **Prisma:** `packages/prisma/dist/` — Client wrapper
- **Shared:** `packages/shared/dist/` — Types bundle

All build outputs are gitignored.

## Environment Variables

**Priority order:**
1. `.env.local` (local overrides, gitignored)
2. `.env` (committed defaults)
3. System environment variables

See `.env.example` for all available variables.

## Testing Structure

- **Unit tests:** Co-located with source files (`*.spec.ts`)
- **Integration tests:** `apps/api/test/`
- **E2E tests:** `apps/web/cypress/` (future)

Run tests: `make test` or `pnpm test`

## Deployment

- **Frontend:** Vercel (automatic from `main` branch)
- **API:** Railway or Render (Docker deployment)
- **Realtime:** Railway or Render (Docker deployment)
- **Database:** Neon or Supabase (managed PostgreSQL)

See `README.md` for deployment instructions.
