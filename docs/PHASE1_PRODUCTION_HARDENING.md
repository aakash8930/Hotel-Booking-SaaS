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

- Protect public booking/payment mutation endpoints with a booking access token or authenticated guest ownership model.
- Validate payment webhook signatures against the exact provider signing scheme and preserve the raw request body where required.
- Add payment amount/currency reconciliation before marking a payment successful.
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
