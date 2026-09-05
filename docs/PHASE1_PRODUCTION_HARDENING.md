# Phase 1 — Production Hardening Checklist

## Completed in this phase

- Global DTO validation with whitelist + non-whitelisted field rejection.
- Global API throttling guard enabled (60 requests/minute default).
- Explicit API CORS allowlist via `APP_CORS_ORIGINS`.
- Baseline security response headers.
- WebSocket origin allowlist via `WS_ALLOWED_ORIGIN`.
- Production startup now fails if JWT secrets are missing instead of silently using development defaults.
- Refresh-token persistence uses deterministic SHA-256 hashing so token lookup works correctly during rotation.
- Host, guest and admin refresh-token flows share the corrected deterministic storage strategy.

## Important migration note

Existing refresh tokens created by older builds used salted bcrypt hashes and cannot be looked up by the new deterministic hash. After deployment, existing sessions must authenticate again and receive new refresh tokens. Do not attempt to convert old refresh-token hashes.

## Remaining production gates

- ✅ Protect public booking read/cancel/confirm/payment operations with a 256-bit opaque booking capability token; only its SHA-256 hash is persisted.
- ✅ Preserve the raw request body for webhook verification and reconcile provider webhook amount against the persisted payment amount when supplied.
- Verify the exact PhonePe signing scheme against current provider documentation before production credentials are enabled.
- Add currency reconciliation and reject missing provider amount fields if the live provider contract guarantees them.
- Add refund retry/reconciliation state instead of treating a provider call as immediately settled.
- Verify admin authorization on every sensitive admin route.
- Add secure cookie/session strategy if tokens are moved out of browser storage.
- Run dependency vulnerability scanning.
- Run production build + E2E suite.
- Run load tests against a production-like PostgreSQL/Redis topology.
- Test database backup/restore.
- Add operational alerting and incident runbooks.
- Add HSTS at the TLS/reverse-proxy layer after the HTTPS deployment is established.

## Production rule

Never deploy with development JWT fallback secrets, wildcard WebSocket origins, or unrestricted CORS. Keep `APP_CORS_ORIGINS` and `WS_ALLOWED_ORIGIN` restricted to the real application origins.
