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

## Milestone 6: premium pricing decision workspace

Added /host/pricing with a premium host-facing calendar-style decision table, 30-day recommendation summary, demand/pace details, recommendation drawer, explicit approval action, refresh/error/loading states, and recent decision history. Live prices remain unchanged until the execution milestone.

## Milestone 7: versioned price execution and rollback

Added DailyRoomPrice as a dated, per-room price version. Approved pricing can now be applied transactionally through POST /host/pricing-execution/approval/:id/apply. Each version stores the prior price and increments a version number. POST /host/pricing-execution/version/:id/rollback restores the previous price while preserving the replaced value. GET /host/pricing-execution/:propertyId exposes dated live-price versions. A quote helper also resolves nightly rates with base-price fallback.

Live booking integration remains the final execution step: booking creation must call the quote path before persisting totalPrice, and that integration should be tested against overlapping bookings and pricing changes.

## Milestone 8: booking price integration

Booking creation now resolves DailyRoomPrice for each night of a stay, falling back to Room.basePrice when no dated override exists. Mixed-rate stays are summed nightly before Booking.totalPrice is persisted. Added a focused test scaffold for mixed rates, fallback behavior, price immutability after booking, and concurrency coverage.

### Phase 3 core status
Revenue intelligence → recommendation → approval → dated price execution → booking total integration is now connected. The remaining work is verification: run database migrations, compile/typecheck the monorepo, execute the dynamic-pricing and existing concurrency suites, then fix any integration failures before declaring Phase 3 production-ready.