import { costsPage } from "@/lib/app/costs";
import { appContext, appJson, appNotFound } from "@/lib/app/request";
import { bucketUnit, periodStart, readPeriod } from "@/lib/insights";
import { exportCharges, exportDrives } from "@/lib/queries";
import {
  driveTotals,
  periodChargeTotals,
  statsBuckets,
} from "@/lib/stats-data";

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/app/cars/[carId]/costs">,
) {
  const context = await appContext(params);
  if (!context) return appNotFound();
  const { car, f, preferences, now } = context;
  const period = readPeriod(
    new URL(request.url).searchParams.get("period") ?? undefined,
    preferences.period,
  );
  const from = periodStart(period, now);
  const unit = bucketUnit(period);
  const range = from === null ? null : { start: from, end: now };
  const timeZone = f.timeZone;
  const [buckets, drives, charges, driveTotalsRow, chargeTotals] =
    await Promise.all([
      statsBuckets(
        car.id,
        from,
        unit,
        timeZone,
        preferences.weekStart === "sunday",
      ),
      exportDrives(car, range),
      exportCharges(car.id, range),
      driveTotals(car.id, from),
      periodChargeTotals(car.id, from),
    ]);
  return appJson(
    costsPage(
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
    ),
  );
}
