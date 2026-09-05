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


## Milestone 2: demand-aware pricing calendar

Added GET /host/pricing-calendar/:propertyId with a 1–90 day window. The service calculates occupied rooms per date, derives demand percentage, resolves applicable active pricing rules, and produces per-room suggested prices. This is a preview/simulation layer; booking prices remain unchanged until explicit approval and audit controls are implemented.

## Milestone 3: booking pace engine

Added GET /host/booking-pace/:propertyId. It compares reservation pickup in the latest 7-day window against the preceding 7-day window for each future date, producing accelerating, slowing, or stable pace signals. The output includes booked rooms, occupancy, current pickup, prior pickup, and pace delta.

## Milestone 4: revenue recommendation engine

Added GET /host/revenue-recommendations/:propertyId. For each future date it combines forward occupancy and recent-vs-prior booking pickup to produce an explainable INCREASE, HOLD, or DECREASE recommendation with adjustment percentage, confidence, and reason. This is advisory only; it does not change live booking prices.

## Milestone 5: explicit approval and audit trail

Added PricingApproval persistence and protected host APIs:
- POST /host/pricing-approvals/:propertyId
- GET /host/pricing-approvals/:propertyId
- PATCH /host/pricing-approvals/:id/decision

Each decision records the property, host, effective date, room, previous price, proposed price, action, reason, status, and decision timestamp. A decision cannot be finalized twice. This milestone records decisions but intentionally does not mutate live room prices yet.