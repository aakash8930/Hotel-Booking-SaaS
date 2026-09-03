# Hotel Booking SaaS — Makefile
# ─────────────────────────────────────────────────────────────────────────────
# Usage:
#   make setup        # First-time setup
#   make dev          # Start all services
#   make stop         # Stop all services
#   make clean        # Clean up everything
# ─────────────────────────────────────────────────────────────────────────────

.PHONY: setup dev stop clean db-generate db-push db-migrate db-seed db-studio test lint build

# ── Setup ────────────────────────────────────────────────────────────────────

setup: install infra-up db-generate db-push db-seed
	@echo "✅ Setup complete! Run 'make dev' to start development."

install:
	@echo "📦 Installing dependencies..."
	pnpm install

# ── Infrastructure ───────────────────────────────────────────────────────────

infra-up:
	@echo "🐳 Starting PostgreSQL and Redis..."
	docker compose up -d
	@sleep 3
	@echo "✅ Infrastructure running"

infra-down:
	@echo "🛑 Stopping infrastructure..."
	docker compose down

infra-restart:
	@echo "🔄 Restarting infrastructure..."
	docker compose restart

infra-logs:
	docker compose logs -f

# ── Development ──────────────────────────────────────────────────────────────

dev:
	@echo "🚀 Starting development servers..."
	@echo "   API:       http://localhost:4000"
	@echo "   Frontend:  http://localhost:3000"
	@echo "   WebSocket: ws://localhost:4001"
	@echo ""
	@echo "Press Ctrl+C to stop all services"
	@echo ""
	pnpm dev

dev-api:
	pnpm dev:api

dev-web:
	pnpm dev:web

dev-realtime:
	cd apps/realtime && go run .

stop:
	@echo "🛑 Stopping all services..."
	-pkill -f "nest start"
	-pkill -f "next dev"
	-pkill -f "go run"
	docker compose down
	@echo "✅ All services stopped"

# ── Database ─────────────────────────────────────────────────────────────────

db-generate:
	@echo "🔧 Generating Prisma client..."
	pnpm db:generate

db-push:
	@echo "📤 Pushing schema to database..."
	pnpm db:push

db-migrate:
	@echo "📝 Creating migration..."
	pnpm db:migrate

db-seed:
	@echo "🌱 Seeding database..."
	pnpm db:seed

db-studio:
	@echo "🔍 Opening Prisma Studio..."
	pnpm db:studio

db-reset:
	@echo "⚠️  Resetting database..."
	pnpm db:push --force-reset
	pnpm db:seed

# ── Testing & Linting ────────────────────────────────────────────────────────

test:
	@echo "🧪 Running tests..."
	pnpm test

test-api:
	pnpm --filter @hbs/api test

test-watch:
	pnpm --filter @hbs/api test:watch

lint:
	@echo "🔍 Linting code..."
	pnpm lint

lint-fix:
	pnpm lint --fix

format:
	@echo "💅 Formatting code..."
	pnpm --filter @hbs/api exec prettier --write "src/**/*.ts"
	pnpm --filter @hbs/web exec prettier --write "src/**/*.{ts,tsx}"

# ── Building ─────────────────────────────────────────────────────────────────

build:
	@echo "🏗️  Building all packages..."
	pnpm build

build-api:
	pnpm build:api

build-web:
	pnpm build:web

build-realtime:
	cd apps/realtime && go build -o bin/realtime .

# ── Utilities ────────────────────────────────────────────────────────────────

clean:
	@echo "🧹 Cleaning up..."
	rm -rf node_modules
	rm -rf apps/*/node_modules
	rm -rf packages/*/node_modules
	rm -rf apps/*/dist
	rm -rf apps/*/build
	rm -rf apps/*/.next
	rm -rf packages/*/dist
	rm -rf pnpm-lock.yaml
	docker compose down -v
	@echo "✅ Cleaned"

reinstall: clean install
	@echo "✅ Reinstalled dependencies"

# ── Help ─────────────────────────────────────────────────────────────────────

help:
	@echo ""
	@echo "Hotel Booking SaaS — Available Commands"
	@echo "════════════════════════════════════════"
	@echo ""
	@echo "Setup:"
	@echo "  make setup          First-time setup (install + infra + db)"
	@echo "  make install        Install dependencies"
	@echo ""
	@echo "Development:"
	@echo "  make dev            Start all services"
	@echo "  make dev-api        Start API only"
	@echo "  make dev-web        Start frontend only"
	@echo "  make dev-realtime   Start WebSocket service only"
	@echo "  make stop           Stop all services"
	@echo ""
	@echo "Infrastructure:"
	@echo "  make infra-up       Start PostgreSQL + Redis"
	@echo "  make infra-down     Stop infrastructure"
	@echo "  make infra-restart  Restart infrastructure"
	@echo "  make infra-logs     View infrastructure logs"
	@echo ""
	@echo "Database:"
	@echo "  make db-generate    Generate Prisma client"
	@echo "  make db-push        Push schema to database"
	@echo "  make db-migrate     Create migration"
	@echo "  make db-seed        Seed demo data"
	@echo "  make db-studio      Open Prisma Studio"
	@echo "  make db-reset       Reset and reseed database"
	@echo ""
	@echo "Testing & Quality:"
	@echo "  make test           Run all tests"
	@echo "  make test-api       Run API tests"
	@echo "  make lint           Lint all code"
	@echo "  make lint-fix       Auto-fix lint issues"
	@echo "  make format         Format code"
	@echo ""
	@echo "Building:"
	@echo "  make build          Build all packages"
	@echo "  make build-api      Build API"
	@echo "  make build-web      Build frontend"
	@echo "  make build-realtime Build WebSocket service"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean          Clean everything"
	@echo "  make reinstall      Clean + reinstall"
	@echo "  make help           Show this help"
	@echo ""
