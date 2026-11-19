import { bucketHasActivity } from "../costs";
import { bucketUnit, type PeriodId } from "../insights";
import type { Formatter } from "../format";
import type { Charge, Drive } from "../queries";
import type { ChargeTotals, DriveTotals, StatsBucket } from "../stats-data";
import {
  costliestCharges,
  costliestDrives,
  costPerDistance,
  costTotals,
  mergeCostBuckets,
  totalRunningCost,
} from "../costs";
import { buildChart } from "./chart";
import type { AppSection, CostsPage } from "./contract";
import { chartBlock, panel, periodChoices, periodLabel } from "./panels";
import { appStat, appValue } from "./values";

export type CostsInput = {
  buckets: StatsBucket[];
  drives: Drive[];
  charges: Charge[];
  driveTotals: DriveTotals;
  chargeTotals: ChargeTotals;
  period: PeriodId;
  pricePerKwh: number | null;
};

function bucketLabel(period: PeriodId): string {
  const unit = bucketUnit(period);
  return { day: "day", week: "week", month: "month" }[unit];
}

function notices(
  totals: ReturnType<typeof costTotals>,
  chargeTotals: ChargeTotals,
  pricePerKwh: number | null,
): string[] {
  const lines: string[] = [];
  if (pricePerKwh === null) {
    lines.push(
      "Set a price per kWh in Settings to estimate driving cost from TeslaMate consumption.",
    );
  } else if (totals.drivesUnknown > 0) {
    lines.push(
      `${totals.drivesUnknown} ${totals.drivesUnknown === 1 ? "drive has" : "drives have"} no consumption data, so driving cost leaves ${totals.drivesUnknown === 1 ? "it" : "them"} out.`,
    );
  }
  if (totals.chargesUnknown > 0) {
    lines.push(
      `${totals.chargesUnknown} ${totals.chargesUnknown === 1 ? "charge has" : "charges have"} no cost in TeslaMate.`,
    );
  }
  if (chargeTotals.estimatedCosts > 0) {
    lines.push(
      `${chargeTotals.estimatedCosts} of ${chargeTotals.sessions} ${chargeTotals.sessions === 1 ? "charge uses" : "charges use"} your price from Settings.`,
    );
  }
  return lines;
}

export function costsPage(
  input: CostsInput,
  f: Formatter,
  now: Date,
): CostsPage {
  const totals = costTotals(
    input.drives,
    input.charges,
    input.driveTotals,
    input.chargeTotals,
    input.pricePerKwh,
  );
  const running = totalRunningCost(totals.drivingCost, totals.chargingCost);
  const buckets = mergeCostBuckets(
    input.buckets,
    input.drives,
    input.pricePerKwh,
  );
  const activeBuckets = buckets.filter(bucketHasActivity);
  const unit = bucketUnit(input.period);
  const xFormat = unit === "month" ? "month" : "day";
  const style = f.chartStyle;
  const rankedDrives = costliestDrives(input.drives, input.pricePerKwh);
  const rankedCharges = costliestCharges(input.charges);
  const costChart = buildChart({
    title: "Cost",
    rows: activeBuckets.map((bucket) => ({
      at: bucket.at.getTime(),
      driving: bucket.drivingCost,
      charging: bucket.chargingCost,
    })),
    xKey: "at",
    xFormat,
    style,
    left: "zero",
    series: [
      {
        key: "driving",
        label: "Driving",
        unit: "",
        color: "chart1",
        kind: "bar",
      },
      {
        key: "charging",
        label: "Charging",
        unit: "",
        color: "charge",
        kind: "bar",
      },
    ],
  });
  const sections: AppSection[] = [
    {
      title: null,
      subtitle: null,
      period: false,
      panels: [
        panel(
          "Cost over time",
          [
            costChart
              ? chartBlock(costChart)
              : { kind: "note", text: "No record yet." },
          ],
          activeBuckets.length ? `Per ${bucketLabel(input.period)}` : null,
        ),
      ],
    },
    {
      title: "Breakdown",
      subtitle: null,
      period: false,
      panels: [
        panel(`By ${bucketLabel(input.period)}`, [
          activeBuckets.length > 0 && {
            kind: "table",
            columns: [
              bucketLabel(input.period) === "day"
                ? "Day"
                : bucketLabel(input.period) === "week"
                  ? "Week"
                  : "Month",
              "Driving",
              "Charging",
              "Total",
              f.units.distance,
              "Used",
              "Charged",
            ],
            rows: activeBuckets.map((bucket) => {
              const rowTotal =
                bucket.drivingCost === null && bucket.chargingCost === null
                  ? null
                  : totalRunningCost(bucket.drivingCost, bucket.chargingCost);
              return {
                key: String(bucket.at.getTime()),
                cells: [
                  appValue(
                    unit === "month"
                      ? f.date(bucket.at)
                      : f.day(bucket.at, now),
                  ),
                  appValue(
                    bucket.drivingCost === null
                      ? "—"
                      : f.cost(bucket.drivingCost),
                  ),
                  appValue(
                    bucket.chargingCost === null
                      ? "—"
                      : f.cost(bucket.chargingCost),
                  ),
                  appValue(rowTotal === null ? "—" : f.cost(rowTotal)),
                  appValue(f.distance(bucket.distanceKm)),
                  appValue(f.energy(bucket.usedKwh)),
                  appValue(f.energy(bucket.chargedKwh)),
                ],
              };
            }),
          },
        ]),
      ],
    },
    {
      title: "Records",
      subtitle: null,
      period: false,
      panels: [
        panel("Costliest drives", [
          rankedDrives.length > 0 && {
            kind: "records",
            rows: rankedDrives.map((row, index) => ({
              key: String(row.id),
              rank: index + 1,
              title: `${row.from} → ${row.to}`,
              badge: null,
              value: f.cost(row.cost),
              detail: `${f.distance(row.distanceKm)} · ${f.day(row.startAt, now)}`,
              note: null,
              bar: null,
              target: { kind: "drive", id: row.id },
              links: [],
            })),
          },
        ]),
        panel("Costliest charges", [
          rankedCharges.length > 0 && {
            kind: "records",
            rows: rankedCharges.map((row, index) => ({
              key: String(row.id),
              rank: index + 1,
              title: row.place,
              badge: null,
              value: f.cost(row.cost),
              detail: `+${f.energy(row.energyAddedKwh)} · ${f.day(row.startAt, now)}`,
              note: row.estimated ? "From your price" : null,
              bar: null,
              target: { kind: "charge", id: row.id },
              links: [],
            })),
          },
        ]),
      ],
    },
  ];
  return {
    title: "Costs",
    subtitle: periodLabel(input.period),
    period: input.period,
    periods: periodChoices(),
    hero: [
      appStat(
        "Charging cost",
        totals.chargingCost === null
          ? "No TeslaMate cost"
          : f.cost(totals.chargingCost),
      ),
      appStat(
        "Driving cost",
        totals.drivingCost === null
          ? input.pricePerKwh === null
            ? "No price set"
            : "No estimate"
          : f.cost(totals.drivingCost),
      ),
      appStat(
        "Cost per distance",
        costPerDistance(running, totals.distanceKm, f) ?? "No total",
      ),
      appStat("Energy used", f.energy(totals.usedKwh)),
      appStat("Energy charged", f.energy(totals.chargedKwh)),
      appStat(
        "Total cost",
        running === null ? "No total" : f.cost(running),
        running === null
          ? undefined
          : {
              detail:
                [
                  totals.drivingCost !== null
                    ? `${f.cost(totals.drivingCost)} driving`
                    : null,
                  totals.chargingCost !== null
                    ? `${f.cost(totals.chargingCost)} charging`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || null,
            },
      ),
    ],
    heroBlocks: [],
    notices: notices(totals, input.chargeTotals, input.pricePerKwh),
    sections,
  };
}
