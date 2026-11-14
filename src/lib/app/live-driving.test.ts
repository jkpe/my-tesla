import { describe, expect, test } from "bun:test";
import { createFormatter } from "../format";
import { liveView } from "../live/view";
import { defaultPreferences } from "../preferences";
import { liveDrivingLayout } from "./live-driving";

const f = createFormatter(defaultPreferences, "Europe/Istanbul");

describe("liveDrivingLayout", () => {
  test("returns null when the car is not driving", () => {
    const view = liveView({ state: "online", shift_state: "P" });
    expect(
      liveDrivingLayout(view, f, { latitude: 1, longitude: 2 }, true),
    ).toBeNull();
  });

  test("builds speed, destination, map, and secondary tiles", () => {
    const view = liveView({
      state: "driving",
      shift_state: "D",
      speed: "88",
      power: "21",
      locked: "true",
      active_route: JSON.stringify({
        destination: "Saguaro Lake",
        miles_to_arrival: 12.4,
        minutes_to_arrival: 18,
        energy_at_arrival: 71,
        traffic_minutes_delay: 0,
        location: { latitude: 33.5, longitude: -111.6 },
      }),
    });
    const layout = liveDrivingLayout(
      view,
      f,
      { latitude: 33.42, longitude: -111.94 },
      true,
    );
    expect(layout?.speed.value.text).toBe("88 km/h");
    expect(layout?.speed.detail).toBe("21 kW");
    expect(layout?.destination?.title).toBe("Saguaro Lake");
    expect(layout?.destination?.detail).toContain("18 min");
    expect(layout?.destination?.detail).toContain("71% on arrival");
    expect(layout?.map).toEqual({ latitude: 33.5, longitude: -111.6 });
    expect(layout?.tiles.map((tile) => tile.key)).toEqual(["lock"]);
  });

  test("falls back to the snapshot position without route location", () => {
    const view = liveView({
      state: "driving",
      shift_state: "D",
      speed: "40",
      power: "5",
    });
    const layout = liveDrivingLayout(
      view,
      f,
      { latitude: 48.1, longitude: 11.6 },
      true,
    );
    expect(layout?.map).toEqual({ latitude: 48.1, longitude: 11.6 });
    expect(layout?.destination).toBeNull();
  });

  test("hides the map when maps are off", () => {
    const view = liveView({ state: "driving", shift_state: "D", speed: "10" });
    expect(
      liveDrivingLayout(view, f, { latitude: 1, longitude: 2 }, false)?.map,
    ).toBeNull();
  });
});
