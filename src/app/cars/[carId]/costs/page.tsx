import { ChevronRight, CircleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SeriesChart } from "@/components/charts/series-chart";
import { Metric } from "@/components/metric";
import { PageTransition } from "@/components/page-transition";
import { Panel, PanelNote } from "@/components/panel";
import { PeriodLinks } from "@/components/period-links";
import { requireCar } from "@/lib/car-route";
import { carPath } from "@/lib/car-slug";
import {
  bucketHasActivity,
  costliestCharges,
  costliestDrives,
  mergeCostBuckets,
  totalRunningCost,
} from "@/lib/costs";
import { costsPage } from "@/lib/app/costs";
import { bucketUnit, periodStart, periods, readPeriod } from "@/lib/insights";
import { exportCharges, exportDrives } from "@/lib/queries";
import {
  driveTotals,
  periodChargeTotals,
  statsBuckets,
} from "@/lib/stats-data";
import { getFormatter, getPreferences } from "@/lib/viewer";

export const instant = false;

export const metadata: Metadata = { title: "Costs" };

const colors = {
  driving: "var(--chart-1)",
  charging: "var(--charge)",
};

export default async function CostsPage({
  params,
  searchParams,
}: PageProps<"/cars/[carId]/costs">) {
  const [car, query, f, preferences] = await Promise.all([
    requireCar(params),
    searchParams,
    getFormatter(),
    getPreferences(),
  ]);
  const now = new Date();
  const period = readPeriod(
    typeof query.period === "string" ? query.period : undefined,
    preferences.period,
  );
  const from = periodStart(period, now);
  const unit = bucketUnit(period);
  const range = from === null ? null : { start: from, end: now };
  const [buckets, drives, charges, driveTotalsRow, chargeTotals] =
    await Promise.all([
      statsBuckets(
        car.id,
        from,
        unit,
        f.timeZone,
        preferences.weekStart === "sunday",
      ),
      exportDrives(car, range),
      exportCharges(car.id, range),
      driveTotals(car.id, from),
      periodChargeTotals(car.id, from),
    ]);
  const page = costsPage(
    {
      buckets,
      drives,
      charges,
      driveTotals: driveTotalsRow,
      chargeTotals,
      period,
      pricePerKwh: preferences.chargePrice,
    },
    f,
    now,
  );
  const costBuckets = mergeCostBuckets(
    buckets,
    drives,
    preferences.chargePrice,
  ).filter(bucketHasActivity);
  const xFormat = unit === "month" ? "month" : "day";
  const bucketLabel = { day: "day", week: "week", month: "month" }[unit];
  const chartRows = costBuckets.map((bucket) => ({
    at: bucket.at.getTime(),
    driving: bucket.drivingCost,
    charging: bucket.chargingCost,
  }));
  const periodLabel =
    periods.find((candidate) => candidate.id === period)?.label ?? "";
  const rankedDrives = costliestDrives(drives, preferences.chargePrice);
  const rankedCharges = costliestCharges(charges);

  return (
    <PageTransition>
      <div className="flex flex-wrap items-end justify-between gap-4 pt-6 md:pt-10">
        <div>
          <p className="text-sm text-muted-foreground">
            {period === "all" ? "All records" : `Last ${periodLabel}`}
          </p>
          <h1 className="mt-1 text-[32px] leading-[1.2] font-medium md:text-[40px]">
            Costs
          </h1>
        </div>
        <PeriodLinks base={carPath(car, "/costs")} active={period} />
      </div>

      <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-3">
        {page.hero.map((stat) => (
          <Metric
            key={stat.label}
            size="lg"
            label={stat.label}
            value={stat.value.text}
            detail={stat.detail ?? undefined}
          />
        ))}
      </dl>

      {page.notices.length > 0 && (
        <div className="mt-8 space-y-3">
          {page.notices.map((notice) => (
            <p
              key={notice}
              className="flex items-start gap-2 text-sm text-muted-foreground"
            >
              <CircleAlert
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-warning"
              />
              {notice}
            </p>
          ))}
        </div>
      )}

      <div className="mt-12 grid grid-cols-1 gap-4">
        <Panel
          title={
            preferences.currency === "none"
              ? "Cost over time"
              : `Cost over time (${preferences.currency})`
          }
          action={
            costBuckets.length ? (
              <span className="text-xs text-subtle">Per {bucketLabel}</span>
            ) : undefined
          }
        >
          {chartRows.length > 1 ? (
            <SeriesChart
              data={chartRows}
              xKey="at"
              xFormat={xFormat}
              chartStyle={f.chartStyle}
              series={[
                {
                  key: "driving",
                  label: "Driving",
                  color: colors.driving,
                  digits: 2,
                  kind: "bar",
                },
                {
                  key: "charging",
                  label: "Charging",
                  color: colors.charging,
                  digits: 2,
                  kind: "bar",
                },
              ]}
              yDomain={[0, "auto"]}
              height={240}
            />
          ) : (
            <PanelNote>No record yet.</PanelNote>
          )}
        </Panel>

        <Panel title={`By ${bucketLabel}`}>
          {costBuckets.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="text-left text-xs text-subtle">
                    <th className="pb-3 font-medium capitalize">
                      {bucketLabel}
                    </th>
                    <th className="pb-3 font-medium">Driving</th>
                    <th className="pb-3 font-medium">Charging</th>
                    <th className="pb-3 font-medium">Total</th>
                    <th className="pb-3 font-medium tabular">
                      {f.units.distance}
                    </th>
                    <th className="pb-3 font-medium">Used</th>
                    <th className="pb-3 font-medium">Charged</th>
                  </tr>
                </thead>
                <tbody>
                  {costBuckets.map((bucket) => {
                    const rowTotal = totalRunningCost(
                      bucket.drivingCost,
                      bucket.chargingCost,
                    );
                    return (
                      <tr
                        key={bucket.at.getTime()}
                        className="border-t border-border"
                      >
                        <td className="py-2.5 tabular">
                          {unit === "month"
                            ? f.date(bucket.at)
                            : f.day(bucket.at, now)}
                        </td>
                        <td className="py-2.5 tabular">
                          {bucket.drivingCost === null
                            ? "—"
                            : f.cost(bucket.drivingCost)}
                        </td>
                        <td className="py-2.5 tabular">
                          {bucket.chargingCost === null
                            ? "—"
                            : f.cost(bucket.chargingCost)}
                        </td>
                        <td className="py-2.5 tabular">
                          {rowTotal === null ? "—" : f.cost(rowTotal)}
                        </td>
                        <td className="py-2.5 tabular">
                          {f.distance(bucket.distanceKm)}
                        </td>
                        <td className="py-2.5 tabular">
                          {f.energy(bucket.usedKwh)}
                        </td>
                        <td className="py-2.5 tabular">
                          {f.energy(bucket.chargedKwh)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <PanelNote>No record yet.</PanelNote>
          )}
        </Panel>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Costliest drives">
            {rankedDrives.length ? (
              <ol className="-mx-2">
                {rankedDrives.map((drive, index) => (
                  <li key={drive.id}>
                    <Link
                      href={carPath(car, `/drives/${drive.id}`)}
                      transitionTypes={["tab-forward"]}
                      className="flex items-center gap-4 rounded px-2 py-2.5 transition-tesla hover:bg-accent"
                    >
                      <span className="w-4 text-sm text-subtle tabular">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {drive.from} → {drive.to}
                        </span>
                        <span className="block text-xs text-muted-foreground tabular">
                          {f.day(drive.startAt, now)} ·{" "}
                          {f.distance(drive.distanceKm)}
                        </span>
                      </span>
                      <span className="text-sm font-medium tabular">
                        {f.cost(drive.cost)}
                      </span>
                      <ChevronRight className="size-4 text-subtle" />
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <PanelNote>
                {preferences.chargePrice === null
                  ? "Set a price per kWh in Settings to rank drives."
                  : "No priced drives in this period."}
              </PanelNote>
            )}
          </Panel>
          <Panel title="Costliest charges">
            {rankedCharges.length ? (
              <ol className="-mx-2">
                {rankedCharges.map((charge, index) => (
                  <li key={charge.id}>
                    <Link
                      href={carPath(car, `/charging/${charge.id}`)}
                      transitionTypes={["tab-forward"]}
                      className="flex items-center gap-4 rounded px-2 py-2.5 transition-tesla hover:bg-accent"
                    >
                      <span className="w-4 text-sm text-subtle tabular">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {charge.place}
                        </span>
                        <span className="block text-xs text-muted-foreground tabular">
                          {f.day(charge.startAt, now)} · +
                          {f.energy(charge.energyAddedKwh)}
                          {charge.estimated ? " · From your price" : ""}
                        </span>
                      </span>
                      <span className="text-sm font-medium tabular">
                        {f.cost(charge.cost)}
                      </span>
                      <ChevronRight className="size-4 text-subtle" />
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <PanelNote>No charges with a cost in this period.</PanelNote>
            )}
          </Panel>
        </div>
      </div>
    </PageTransition>
  );
}
