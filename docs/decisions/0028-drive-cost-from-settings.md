# 0028: Drive cost from the price in Settings

Date: 2026-11-14

Status: Accepted.

## Context

The Drives list and the drive page show distance and consumption. They do not show money. Owners who set a price per kWh in Settings already get charging cost estimates everywhere else, but not for energy used while driving.

## Decision

1. Pure helpers in `src/lib/drive-cost.ts` compute the energy of a drive as `(efficiencyWhPerKm × distanceKm) / 1000`, the same rule as trip totals in `src/lib/trip.ts`.
2. Driving cost is that energy times `chargePrice` from Settings. The fast charging price does not apply to driving.
3. The Drives list shows the sum for each trip. The drive page shows one drive. Trip legs show each leg when a trip has more than one drive.
4. When no price is set or the drive has no consumption, the cost is missing and the UI shows the same dash as other costs.
5. The drive page names the source in the stat detail: “At your price per kWh”.

## Alternatives

1. Use position-series energy. That can disagree with TeslaMate drive consumption and with trip totals.
2. Write a cost into TeslaMate. This breaks the read-only rule.

## Consequences

A price change updates every past drive cost at once, like estimated charging cost in [0011](0011-charging-cost-from-a-price.md). The value is an estimate from TeslaMate consumption, not a bill.