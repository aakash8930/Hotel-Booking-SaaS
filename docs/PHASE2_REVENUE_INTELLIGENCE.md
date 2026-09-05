# Phase 2 — Revenue Intelligence

## First vertical: host revenue intelligence

StayEase now exposes a protected host-only endpoint:

GET /host/revenue/:propertyId

It verifies property ownership through the authenticated host identity and returns:

- 30-day revenue and booking summary
- cancellation count
- average booking value
- per-room booking nights and revenue
- 14-day forward demand signal
- high-demand dates where rate increases may be justified
- low-demand dates where targeted promotions may be useful
- cancellation-rate warnings

## Product differentiation

This is the beginning of the Hotel Revenue OS direction. Instead of only helping a property accept reservations, StayEase can turn its operational data into concrete decisions for the owner.

### Guardrails

Recommendations are deterministic and transparent in this first release. They are not presented as guaranteed forecasts and do not silently change room prices.

### Next verticals

1. Revenue dashboard UI
2. Daily/weekly trend charts
3. Room-level pricing recommendations
4. Booking pace / pickup analytics
5. Occupancy and ADR/RevPAR metrics
6. AI explanation layer grounded in these metrics
7. One-click price-rule proposals with explicit host approval


## UI milestone

The first premium host-facing Revenue Intelligence dashboard is now available at /host/revenue. It presents KPI cards, a 14-day demand visualization, actionable recommendation cards, and room-level economics.

## Metrics milestone

The revenue API and dashboard now expose occupancy rate, ADR, RevPAR, and seven-day booking pickup alongside revenue and demand signals. These form the analytical foundation for the future AI copilot.