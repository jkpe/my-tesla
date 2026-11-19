import { driveCost } from "./drive-cost";
import type { Formatter } from "./format";
import type { Charge, Drive } from "./queries";
import type { ChargeTotals, DriveTotals, StatsBucket } from "./stats-data";

export type CostTotals = {
  drivingCost: number | null;
  chargingCost: number | null;
  distanceKm: number;
  usedKwh: number;
  chargedKwh: number;
  drivesPriced: number;
  drivesUnknown: number;
  chargesPriced: number;
  chargesUnknown: number;
};

export type CostBucket = {
  at: Date;
  drivingCost: number | null;
  chargingCost: number | null;
  distanceKm: number;
  usedKwh: number;
  chargedKwh: number;
};

export type CostRankedDrive = {
  id: number;
  from: string;
  to: string;
  startAt: Date;
  distanceKm: number;
  durationMin: number;
  cost: number;
};

export type CostRankedCharge = {
  id: number;
  place: string;
  startAt: Date;
  energyAddedKwh: number;
  cost: number;
  estimated: boolean;
};

function bucketEnd(buckets: StatsBucket[], index: number): number {
  const next = buckets[index + 1];
  return next ? next.at.getTime() : Number.POSITIVE_INFINITY;
}

export function bucketForTime(
  buckets: StatsBucket[],
  at: Date,
): StatsBucket | null {
  const time = at.getTime();
  for (let index = 0; index < buckets.length; index += 1) {
    const bucket = buckets[index]!;
    if (time >= bucket.at.getTime() && time < bucketEnd(buckets, index)) {
      return bucket;
    }
  }
  return null;
}

export function mergeCostBuckets(
  buckets: StatsBucket[],
  drives: Drive[],
  pricePerKwh: number | null,
): CostBucket[] {
  const driving = new Map<number, number>();
  if (pricePerKwh !== null) {
    for (const drive of drives) {
      const cost = driveCost(drive, pricePerKwh);
      const bucket = bucketForTime(buckets, drive.startAt);
      if (cost === null || bucket === null) continue;
      const key = bucket.at.getTime();
      driving.set(
        key,
        Math.round(((driving.get(key) ?? 0) + cost) * 100) / 100,
      );
    }
  }
  return buckets.map((bucket) => {
    const key = bucket.at.getTime();
    return {
      at: bucket.at,
      drivingCost: pricePerKwh === null ? null : (driving.get(key) ?? null),
      chargingCost: bucket.cost,
      distanceKm: bucket.distanceKm,
      usedKwh: bucket.usedKwh,
      chargedKwh: bucket.chargedKwh,
    };
  });
}

export function costTotals(
  drives: Drive[],
  charges: Charge[],
  driveTotals: DriveTotals,
  chargeTotals: ChargeTotals,
  pricePerKwh: number | null,
): CostTotals {
  let drivingCost: number | null = null;
  let drivesPriced = 0;
  let drivesUnknown = 0;
  if (pricePerKwh !== null) {
    let sum = 0;
    for (const drive of drives) {
      const cost = driveCost(drive, pricePerKwh);
      if (cost === null) {
        if (drive.distanceKm !== null && drive.distanceKm > 0)
          drivesUnknown += 1;
        continue;
      }
      sum += cost;
      drivesPriced += 1;
    }
    drivingCost = drivesPriced > 0 ? Math.round(sum * 100) / 100 : null;
  }
  const pricedCharges = charges.filter(
    (charge): charge is Charge & { cost: number } => charge.cost !== null,
  );
  const chargingCost = pricedCharges.length
    ? Math.round(
        pricedCharges.reduce((sum, charge) => sum + charge.cost, 0) * 100,
      ) / 100
    : null;
  return {
    drivingCost,
    chargingCost,
    distanceKm: driveTotals.distanceKm,
    usedKwh: driveTotals.usedKwh,
    chargedKwh: chargeTotals.addedKwh,
    drivesPriced,
    drivesUnknown,
    chargesPriced: pricedCharges.length,
    chargesUnknown: charges.length - pricedCharges.length,
  };
}

export function totalRunningCost(
  drivingCost: number | null,
  chargingCost: number | null,
): number | null {
  const parts = [drivingCost, chargingCost].filter(
    (value): value is number => value !== null,
  );
  return parts.length
    ? Math.round(parts.reduce((sum, value) => sum + value, 0) * 100) / 100
    : null;
}

export function costPerDistance(
  totalCost: number | null,
  distanceKm: number,
  f: Formatter,
): string | null {
  if (totalCost === null || distanceKm <= 0) return null;
  const distance = f.distanceValue(distanceKm);
  if (distance === null || distance <= 0) return null;
  const perUnit = totalCost / distance;
  return `${f.cost(perUnit)} / ${f.units.distance}`;
}

export function costliestDrives(
  drives: Drive[],
  pricePerKwh: number | null,
  limit = 10,
): CostRankedDrive[] {
  if (pricePerKwh === null) return [];
  return drives
    .map((drive) => ({ drive, cost: driveCost(drive, pricePerKwh) }))
    .filter((row): row is { drive: Drive; cost: number } => row.cost !== null)
    .sort((left, right) => right.cost - left.cost)
    .slice(0, limit)
    .map(({ drive, cost }) => ({
      id: drive.id,
      from: drive.from,
      to: drive.to,
      startAt: drive.startAt,
      distanceKm: drive.distanceKm ?? 0,
      durationMin: drive.durationMin ?? 0,
      cost,
    }));
}

export function costliestCharges(
  charges: Charge[],
  limit = 10,
): CostRankedCharge[] {
  return charges
    .filter(
      (charge): charge is Charge & { cost: number } => charge.cost !== null,
    )
    .sort((left, right) => right.cost - left.cost)
    .slice(0, limit)
    .map((charge) => ({
      id: charge.id,
      place: charge.place,
      startAt: charge.startAt,
      energyAddedKwh: charge.energyAddedKwh ?? 0,
      cost: charge.cost,
      estimated: charge.costEstimated,
    }));
}

export function bucketHasActivity(bucket: CostBucket): boolean {
  return (
    bucket.distanceKm > 0 ||
    bucket.chargedKwh > 0 ||
    bucket.drivingCost !== null ||
    bucket.chargingCost !== null
  );
}
