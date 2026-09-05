# Phase 3 — Revenue Automation

## Milestone 1: pricing rules

Added a host-owned pricing rules domain.

API:
- GET /host/pricing-rules/:propertyId
- POST /host/pricing-rules/:propertyId
- PATCH /host/pricing-rules/:id/active

Rules support:
- percentage or fixed adjustment
- demand range (0–100)
- optional date window
- activation/deactivation
- property ownership enforcement

No booking price is silently mutated by these rules yet.

## Safety boundary

Phase 3 separates **recommendation** from **execution**. Pricing changes require explicit host approval in a future milestone and must be auditable/reversible.

Next:
1. pricing calendar
2. booking-pace signal
3. recommendation-to-rule workflow
4. explicit approval + audit log
5. rollback/versioning
