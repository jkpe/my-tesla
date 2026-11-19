import { describe, expect, test } from "bun:test";
import type { Charge, Drive } from "./queries";
import type { ChargeTotals, DriveTotals, StatsBucket } from "./stats-data";
import {
  bucketForTime,
  costliestCharges,
  costliestDrives,
  costTotals,
  mergeCostBuckets,
  totalRunningCost,
} from "./costs";

const drive: Drive = {
  id: 1,
  startAt: new Date("2026-10-01T10:00:00Z"),
  endAt: new Date("2026-10-01T11:00:00Z"),
  from: "Home",
  to: "Work",
  distanceKm: 100,
  durationMin: 60,
  efficiencyWhPerKm: 150,
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

const charge: Charge = {
  id: 2,
  startAt: new Date("2026-10-01T12:00:00Z"),
  endAt: new Date("2026-10-01T14:00:00Z"),
  place: "Home",
  energyAddedKwh: 30,
  startLevel: 20,
  endLevel: 80,
  durationMin: 120,
  maxPowerKw: 11,
  fastCharger: false,
  cost: 25,
  costEstimated: false,
  latitude: null,
  longitude: null,
};

const buckets: StatsBucket[] = [
  {
    at: new Date("2026-10-01T00:00:00Z"),
    distanceKm: 100,
    minutes: 60,
    usedKwh: 15,
    chargedKwh: 30,
    cost: 25,
    outsideC: null,
    cabinC: null,
  },
];

const driveTotals: DriveTotals = {
  drives: 1,
  distanceKm: 100,
  minutes: 60,
  usedKwh: 15,
  speedMaxKmh: null,
  longestKm: null,
};

const chargeTotals: ChargeTotals = {
  sessions: 1,
  addedKwh: 30,
  cost: 25,
  estimatedCosts: 0,
};

describe("mergeCostBuckets", () => {
  test("adds driving cost from the price per kWh", () => {
    const [row] = mergeCostBuckets(buckets, [drive], 0.2);
    expect(row?.drivingCost).toBe(3);
    expect(row?.chargingCost).toBe(25);
  });

  test("leaves driving cost out without a price", () => {
    const [row] = mergeCostBuckets(buckets, [drive], null);
    expect(row?.drivingCost).toBeNull();
  });
});

describe("costTotals", () => {
  test("totals driving and charging cost separately", () => {
    expect(
      costTotals([drive], [charge], driveTotals, chargeTotals, 0.2),
    ).toMatchObject({
      drivingCost: 3,
      chargingCost: 25,
      chargesPriced: 1,
      drivesPriced: 1,
    });
  });

  test("counts charges without a TeslaMate cost", () => {
    expect(
      costTotals(
        [drive],
        [{ ...charge, cost: null }],
        driveTotals,
        { ...chargeTotals, cost: null },
        0.2,
      ).chargesUnknown,
    ).toBe(1);
  });
});

describe("ranked lists", () => {
  test("ranks drives and charges by cost", () => {
    expect(costliestDrives([drive], 0.2)[0]?.cost).toBe(3);
    expect(costliestCharges([charge])[0]?.cost).toBe(25);
  });
});

describe("bucketForTime", () => {
  test("finds the bucket for a drive start", () => {
    expect(bucketForTime(buckets, drive.startAt)?.at).toEqual(buckets[0]!.at);
  });
});

describe("totalRunningCost", () => {
  test("adds only known parts", () => {
    expect(totalRunningCost(3, null)).toBe(3);
    expect(totalRunningCost(null, null)).toBeNull();
  });
});
