import { describe, expect, test } from "bun:test";
import { createFormatter } from "../format";
import { defaultPreferences } from "../preferences";
import type { Charge, Drive } from "../queries";
import {
  lastChargeCardDetail,
  lastChargeLine,
  lastDriveCardDetail,
  lastDriveLine,
} from "./overview-recent";

const f = createFormatter(defaultPreferences, "Europe/Istanbul");
const now = new Date("2026-10-17T15:00:00Z");

const drive: Drive = {
  id: 7,
  startAt: new Date("2026-10-17T13:00:00Z"),
  endAt: new Date("2026-10-17T13:25:00Z"),
  from: "Home",
  to: "Office",
  distanceKm: 18.2,
  durationMin: 25,
  efficiencyWhPerKm: 150,
  speedMaxKmh: 90,
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
  id: 9,
  startAt: new Date("2026-10-16T19:00:00Z"),
  endAt: new Date("2026-10-16T22:00:00Z"),
  place: "Home",
  energyAddedKwh: 24.6,
  startLevel: 30,
  endLevel: 66,
  durationMin: 180,
  maxPowerKw: 11,
  fastCharger: false,
  cost: 50.25,
  costEstimated: false,
  latitude: null,
  longitude: null,
};

describe("lastDriveLine", () => {
  test("shows the driving cost at the price per kWh", () => {
    expect(lastDriveLine(drive, f, now, 0.2)).toBe(
      "Home → Office · 18 km · 25 min · 0.55 · Today 16:00",
    );
  });

  test("leaves the cost out without a price", () => {
    expect(lastDriveLine(drive, f, now, null)).toBe(
      "Home → Office · 18 km · 25 min · Today 16:00",
    );
  });
});

describe("lastDriveCardDetail", () => {
  test("matches the web card detail without the route title", () => {
    expect(lastDriveCardDetail(drive, f, now, 0.2)).toBe(
      "18 km · 25 min · 0.55 · Today 16:00",
    );
  });
});

describe("lastChargeLine", () => {
  test("shows the charge cost from TeslaMate", () => {
    expect(lastChargeLine(charge, f, now)).toBe(
      "Home · +24.6 kWh · 30% → 66% · 50.25 · Yesterday",
    );
  });

  test("leaves the cost out when TeslaMate sends none", () => {
    expect(lastChargeLine({ ...charge, cost: null }, f, now)).toBe(
      "Home · +24.6 kWh · 30% → 66% · Yesterday",
    );
  });
});

describe("lastChargeCardDetail", () => {
  test("shows the charge cost without the place name", () => {
    expect(lastChargeCardDetail(charge, f, now)).toBe(
      "+24.6 kWh · 30% → 66% · 50.25 · Yesterday",
    );
  });
});
