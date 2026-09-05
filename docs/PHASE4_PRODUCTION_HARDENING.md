# Phase 4 — Production Hardening

## Milestone 1: security baseline

Added centralized rate-limit policy definitions for authentication, booking, public-read, and host-write traffic, plus HTTP security-header and request-body limits.

These constants are intentionally separate from controllers so the eventual middleware/Redis implementation can enforce one consistent policy.

## Next hardening tracks

1. Apply limits at the API gateway/middleware layer.
2. Add Redis-backed distributed rate limiting.
3. Add health/readiness endpoints.
4. Add structured request/error logging and correlation IDs.
5. Add metrics and alerting.
6. Add security validation and dependency auditing.
7. Run sustained load tests and define capacity SLOs.
