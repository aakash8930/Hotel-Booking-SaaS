# Phase 4 Security Gates

Production release gates for the hotel booking SaaS.

- Authorization/IDOR: every tenant-owned resource must verify authenticated principal ownership or an explicit permitted role before read/write.
- Payments/webhooks: verify provider signatures, enforce idempotency, and make booking/payment state transitions transactional.
- Uploads: enforce size/type limits, generate server-side object names, and never trust client paths.
- Secrets: production must fail closed when required secrets/configuration are absent.
- Dependencies: run the package manager audit and remediate critical/high findings before release.
- Observability: retain request IDs, structured logs, health checks and metrics.
- Load test: benchmark browse/search, authentication, booking creation, and payment webhook paths independently.
- SLO: publish p95/p99 latency, 5xx rate and availability targets from measured baseline.

Do not mark a gate passed from static assumptions; each gate requires an implementation or test artifact.
