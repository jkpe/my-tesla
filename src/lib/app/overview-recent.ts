import { driveCost } from "../drive-cost";
import type { Formatter } from "../format";
import type { Charge, Drive } from "../queries";
import { ongoingText } from "../vehicle";

function joined(parts: (string | null | false | undefined)[]): string {
  return parts.filter(Boolean).join(" · ");
}

export function lastDriveLine(
  drive: Drive | null,
  f: Formatter,
  now: Date,
  pricePerKwh: number | null,
): string {
  if (!drive) return "No drive yet";
  const cost = driveCost(drive, pricePerKwh);
  return joined([
    `${drive.from} → ${drive.to}`,
    f.distance(drive.distanceKm),
    f.duration(drive.durationMin),
    cost !== null ? f.cost(cost) : null,
    `${f.day(drive.startAt, now)} ${f.clock(drive.startAt)}`,
  ]);
}

export function lastDriveCardDetail(
  drive: Drive,
  f: Formatter,
  now: Date,
  pricePerKwh: number | null,
): string {
  const cost = driveCost(drive, pricePerKwh);
  return joined([
    f.distance(drive.distanceKm),
    f.duration(drive.durationMin),
    cost !== null ? f.cost(cost) : null,
    `${f.day(drive.startAt, now)} ${f.clock(drive.startAt)}`,
  ]);
}

export function lastChargeLine(
  charge: Charge | null,
  f: Formatter,
  now: Date,
): string {
  if (!charge) return "No charge yet";
  const done = charge.endAt
    ? joined([
        `+${f.energy(charge.energyAddedKwh)}`,
        `${charge.startLevel ?? "—"}% → ${charge.endLevel ?? "—"}%`,
        charge.cost !== null ? f.cost(charge.cost) : null,
      ])
    : `${ongoingText} since ${f.clock(charge.startAt)}`;
  return joined([charge.place, done, f.day(charge.startAt, now)]);
}

export function lastChargeCardDetail(
  charge: Charge,
  f: Formatter,
  now: Date,
): string {
  const done = charge.endAt
    ? joined([
        `+${f.energy(charge.energyAddedKwh)}`,
        `${charge.startLevel ?? "—"}% → ${charge.endLevel ?? "—"}%`,
        charge.cost !== null ? f.cost(charge.cost) : null,
      ])
    : `${ongoingText} since ${f.clock(charge.startAt)}`;
  return joined([done, f.day(charge.startAt, now)]);
}
