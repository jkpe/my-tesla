import { describe, expect, test } from "bun:test";
import type { Drive } from "./queries";
import { buildTrips } from "./trip";
import { driveCost, driveEnergyKwh, tripDrivingCost } from "./drive-cost";

function drive(
  id: number,
  distanceKm: number,
  efficiencyWhPerKm: number,
): Drive {
  return {
    id,
    startAt: new Date(),
    endAt: new Date(),
    from: "A",
    to: "B",
    distanceKm,
    durationMin: 60,
    efficiencyWhPerKm,
    speedMaxKmh: null,
    powerMaxKw: null,
    powerMinKw: null,
    ascentM: null,
    descentM: null,
    outsideTempAvg: null,
    startLevel: null,
    endLevel: null,
    leftOpen: false,
  };
}

describe("driveEnergyKwh", () => {
  test("multiplies consumption by distance", () => {
    expect(driveEnergyKwh(drive(1, 100, 150))).toBe(15);
  });

  test("gives no energy without distance or consumption", () => {
    expect(
      driveEnergyKwh({ distanceKm: null, efficiencyWhPerKm: 150 }),
    ).toBeNull();
    expect(
      driveEnergyKwh({ distanceKm: 100, efficiencyWhPerKm: null }),
    ).toBeNull();
  });
});

describe("driveCost", () => {
  test("multiplies energy by the price and rounds to two decimals", () => {
    expect(driveCost(drive(1, 100, 150), 0.3)).toBe(4.5);
    expect(driveCost(drive(1, 40, 200), 0.25)).toBe(2);
  });

  test("gives no cost without a price or energy", () => {
    expect(driveCost(drive(1, 100, 150), null)).toBeNull();
    expect(
      driveCost({ distanceKm: null, efficiencyWhPerKm: 150 }, 0.3),
    ).toBeNull();
  });
});

describe("tripDrivingCost", () => {
  test("sums the cost of every drive in the trip", () => {
    const trips = buildTrips(
      [
        { driveId: 1, tripId: 1, chargedBefore: false },
        { driveId: 2, tripId: 1, chargedBefore: false },
      ],
      [drive(1, 100, 150), drive(2, 50, 200)],
      [],
    );
    const trip = trips.find((row) => row.id === 1);
    expect(tripDrivingCost(trip!, 0.2)).toBe(5);
  });
});
