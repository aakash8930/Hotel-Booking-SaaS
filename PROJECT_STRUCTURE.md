# StayEase — Project Structure

## Applications

### `apps/web`
Next.js guest, host and admin application.

Primary domains:
- discovery/search
- property details
- booking/payment/invoice
- guest account/trips
- host property and booking management
- admin operations

### `apps/api`
NestJS backend API and business logic.

Primary domains include:
- authentication
- properties
- rooms/inventory
- bookings
- payments
- billing
- reviews
- search
- uploads
- realtime integration

### `apps/realtime`
Go WebSocket service for live application events. Redis is used as the shared messaging layer.

## Packages

Shared application/database functionality lives under `packages/`. Keep cross-app contracts here rather than duplicating types and business rules.

## Infrastructure

- PostgreSQL — transactional source of truth
- Prisma — database access/schema tooling
- Redis — caching/pub-sub
- Object storage — property/media assets
- Payment provider — checkout and webhook processing
- Email provider — transactional communication
- Sentry/observability — error visibility

## Architectural rules

1. Booking correctness belongs to PostgreSQL transactions/constraints, not frontend state.
2. Payment status is server authoritative.
3. Webhooks must be idempotent.
4. Redis is not the source of truth for inventory.
5. Search should remain database-driven and paginated.
6. Realtime events improve UX but must never be required for booking correctness.
7. Secrets must only be supplied through environment configuration.

## Production boundary

This repository is currently pre-production. Production approval requires successful build, E2E, security, load, backup/restore and payment-recovery validation.
