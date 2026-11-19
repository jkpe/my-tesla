import { describe, expect, test } from "bun:test";
import { createFormatter } from "../format";
import { defaultPreferences } from "../preferences";
import type { Charge, Drive } from "../queries";
import type { ChargeTotals, DriveTotals, StatsBucket } from "../stats-data";
import { costsPage } from "./costs";

const f = createFormatter(defaultPreferences, "Europe/Istanbul");
const now = new Date("2026-10-17T15:00:00Z");

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
  {
    at: new Date("2026-10-02T00:00:00Z"),
    distanceKm: 0,
    minutes: 0,
    usedKwh: 0,
    chargedKwh: 0,
    cost: null,
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

describe("costsPage", () => {
  test("names the hero totals and links to the costliest records", () => {
    const page = costsPage(
      {
        buckets,
        drives: [drive],
        charges: [charge],
        driveTotals,
        chargeTotals,
        period: "30d",
        pricePerKwh: 0.2,
      },
      f,
      now,
    );
    expect(page.title).toBe("Costs");
    expect(
      page.hero.find((stat) => stat.label === "Charging cost")?.value.text,
    ).toBe(f.cost(25));
    expect(
      page.hero.find((stat) => stat.label === "Driving cost")?.value.text,
    ).toBe(f.cost(3));
    const records = page.sections
      .flatMap((section) => section.panels)
      .flatMap((panel) => panel.blocks)
      .find(
        (block) =>
          block.kind === "records" && block.rows[0]?.title.includes("→"),
      );
    expect(records?.kind).toBe("records");
    if (records?.kind === "records") {
      expect(records.rows[0]?.target).toEqual({ kind: "drive", id: 1 });
    }
  });

  test("explains missing driving cost without a price", () => {
    const page = costsPage(
      {
        buckets,
        drives: [drive],
        charges: [charge],
        driveTotals,
        chargeTotals,
        period: "7d",
        pricePerKwh: null,
      },
      f,
      now,
    );
    expect(page.notices[0]).toContain("price per kWh");
    expect(
      page.hero.find((stat) => stat.label === "Driving cost")?.value.text,
    ).toBe("No price set");
  });
});
