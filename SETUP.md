# Setup Guide

This guide walks you through setting up the Hotel Booking SaaS development environment on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

### Required

- **Node.js 20+** — [Download](https://nodejs.org/)
- **pnpm 9+** — `npm install -g pnpm`
- **Go 1.24+** — [Download](https://go.dev/dl/)
- **Docker & Docker Compose** — [Download](https://www.docker.com/products/docker-desktop)
- **Git** — [Download](https://git-scm.com/)

### Recommended

- **VS Code** with extensions:
  - ESLint
  - Prettier
  - Prisma
  - Tailwind CSS IntelliSense
  - Go
- **Postman** or **Insomnia** for API testing
- **DBeaver** or **TablePlus** for database management

## Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone https://github.com/aakash8930/Hotel-Booking-SaaS.git
cd Hotel-Booking-SaaS
```

### 2. Install Dependencies

```bash
pnpm install
```

This installs all Node.js dependencies across the monorepo.

### 3. Start Infrastructure Services

Start PostgreSQL and Redis using Docker Compose:

```bash
docker compose up -d
```

Verify they're running:

```bash
docker compose ps
```

You should see `postgres` and `redis` containers running.

### 4. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and configure the following:

```bash
# Database (Docker Compose defaults)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hotel_booking_dev"

# Redis (Docker Compose defaults)
REDIS_URL="redis://localhost:6379"

# JWT secrets (generate random strings)
JWT_SECRET="your-random-secret-at-least-32-characters-long"
JWT_REFRESH_SECRET="another-random-secret-for-refresh-tokens"

# App URLs (defaults work for local dev)
NEXT_PUBLIC_API_URL="http://localhost:4000"
NEXT_PUBLIC_WS_URL="ws://localhost:4001"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Generate secure JWT secrets:**

```bash
# Generate a random 64-character string
openssl rand -hex 32
```

### 5. Generate Prisma Client

```bash
pnpm db:generate
```

This generates the Prisma Client based on the schema in `packages/prisma/prisma/schema.prisma`.

### 6. Push Database Schema

```bash
pnpm db:push
```

This creates all tables, indexes, and the critical `EXCLUDE` constraint in your local PostgreSQL database.

### 7. Seed Demo Data (Optional)

```bash
pnpm db:seed
```

This creates:
- A demo host account
- A sample property with 3 rooms
- A demo guest
- Sample bookings (including a test of the EXCLUDE constraint)

### 8. Start Development Servers

Open **three terminal windows**:

**Terminal 1 — NestJS API:**

```bash
pnpm dev:api
```

The API server starts on `http://localhost:4000`.

**Terminal 2 — Next.js Frontend:**

```bash
pnpm dev:web
```

The frontend starts on `http://localhost:3000`.

**Terminal 3 — Go WebSocket Service:**

```bash
cd apps/realtime
go run .
```

The WebSocket service starts on `ws://localhost:4001`.

### 9. Verify Everything Works

**Health Check:**

```bash
curl http://localhost:4000/api/v1/health
```

You should see a JSON response with `status: "healthy"`.

**Open the Frontend:**

Visit `http://localhost:3000` in your browser. You should see the landing page with the hero section.

**Test the API:**

```bash
# Register a new host
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234",
    "name": "Test Host",
    "businessName": "Test Homestay"
  }'
```

You should receive an access token and refresh token.

**Test the EXCLUDE Constraint:**

Open Prisma Studio:

```bash
pnpm db:studio
```

This opens a web interface at `http://localhost:5555` where you can view and edit your database.

Try creating two overlapping bookings for the same room — the database will reject the second one.

## Common Issues

### Port Already in Use

If you see "port already in use" errors:

```bash
# Find and kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Or change the port in the dev script
pnpm dev:web --port 3001
```

### Docker Compose Fails

If Docker Compose fails to start:

```bash
# Stop and remove all containers
docker compose down -v

# Restart
docker compose up -d
```

### Prisma Client Not Found

If you see "Prisma Client not found":

```bash
# Regenerate the client
pnpm db:generate
```

### Database Connection Failed

If the API can't connect to the database:

1. Verify Docker containers are running: `docker compose ps`
2. Check your `DATABASE_URL` in `.env`
3. Try connecting manually: `psql postgresql://postgres:postgres@localhost:5432/hotel_booking_dev`

### Go Module Download Fails

If Go can't download dependencies:

```bash
cd apps/realtime
go mod download
```

If you're behind a proxy, configure Go:

```bash
go env -w GOPROXY=https://proxy.golang.org,direct
```

## Development Workflow

### Daily Development

```bash
# 1. Start infrastructure
docker compose up -d

# 2. Start all services (in separate terminals)
pnpm dev:api
pnpm dev:web
cd apps/realtime && go run .

# 3. Make changes — hot reload is enabled

# 4. Stop services when done
# Ctrl+C in each terminal
docker compose down
```

### Database Changes

When you modify `packages/prisma/prisma/schema.prisma`:

```bash
# Create a migration
pnpm db:migrate

# Or push changes without a migration (dev only)
pnpm db:push
```

### Running Tests

```bash
# All tests
pnpm test

# API tests only
pnpm --filter @hbs/api test

# With coverage
pnpm --filter @hbs/api test:cov
```

### Linting

```bash
# Lint all packages
pnpm lint

# Auto-fix issues
pnpm lint --fix
```

## Next Steps

1. **Explore the Codebase:**
   - `apps/api/src` — NestJS backend
   - `apps/web/src` — Next.js frontend
   - `apps/realtime` — Go WebSocket service
   - `packages/prisma` — Database schema
   - `packages/shared` — Shared types

2. **Read the Architecture Docs:**
   - `README.md` — Overview and architecture
   - This `SETUP.md` — Setup and development workflow

3. **Start Building:**
   - Phase 0 (Foundation) is complete ✅
   - Next: Phase 1 — Core booking flow

## Need Help?

- Check the [Issues](https://github.com/aakash8930/Hotel-Booking-SaaS/issues) page
- Review the [Prisma docs](https://www.prisma.io/docs)
- Review the [NestJS docs](https://docs.nestjs.com/)
- Review the [Next.js docs](https://nextjs.org/docs)
