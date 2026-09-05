# StayEase — Hotel Booking & Operations SaaS

StayEase is a full-stack hotel booking platform evolving into an AI-powered operating system for independent hotels, resorts, homestays and boutique properties.

## Product

### Guest
- Property discovery and search
- Date/guest availability
- Room selection
- Booking soft holds
- PhonePe payment flow
- Booking confirmation
- Invoices
- Trip history

### Host
- Property management
- Room and inventory management
- Booking management
- Billing/payout surfaces
- Property editing

### Admin
- Property moderation
- Host management
- Booking oversight
- Payouts
- Reviews

## Architecture

```
Next.js Web
     |
NestJS API
     |
PostgreSQL + Prisma
     |
Redis ---- Go WebSocket service
     |
Payments / Email / Object Storage / Observability
```

The booking system uses database-backed availability protection and booking-state transitions designed to prevent double booking under concurrent requests.

## Repository structure

- `apps/web` — Next.js application
- `apps/api` — NestJS API
- `apps/realtime` — Go realtime/WebSocket service
- `packages/*` — shared/database packages
- `docs/` — technical documentation
- `scripts/` — development and operational scripts

## Development

See `SETUP.md` and `LOCAL_TESTING.md` for local setup and test instructions.

Use the repository's pnpm workspace and lockfile to keep dependency versions reproducible.

## Production status

The current branch is a **pre-production build**. Before onboarding paying hotels, complete:

1. Production build and E2E verification
2. Security and authentication review
3. Payment/webhook failure and reconciliation testing
4. Database backup/restore validation
5. Search/query performance optimization
6. Load testing with representative production data
7. Realtime origin restrictions and deployment hardening
8. Monitoring, alerting and incident procedures

## Product roadmap

The long-term product direction is:

```
Booking Engine
    ↓
Hotel PMS
    ↓
Hotel Operations OS
    ↓
Revenue Intelligence
    ↓
AI Hotel Copilot
```

The highest-value future capabilities are front-desk operations, housekeeping, OTA/channel management, India-native GST/UPI/WhatsApp workflows, revenue optimization and actionable AI recommendations.

## License

See the repository's license and contribution policies before distributing the software.
