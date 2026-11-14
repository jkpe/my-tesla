import type { Formatter } from "../format";
import { liveTiles } from "../live/tiles";
import type { LiveView } from "../live/view";
import { liveActivity } from "../vehicle";
import type {
  AppStat,
  OverviewLiveDriving,
  OverviewLiveTile,
} from "./contract";
import { appStat } from "./values";

function joined(parts: (string | null | false | undefined)[]): string | null {
  const kept = parts.filter((part): part is string => Boolean(part));
  return kept.length ? kept.join(" · ") : null;
}

function percent(value: number | null): string | null {
  return value === null ? null : `${Math.round(value)}%`;
}

function routeDetail(
  route: NonNullable<LiveView["route"]>,
  f: Formatter,
): string | null {
  return joined([
    route.minutesToArrival !== null && f.duration(route.minutesToArrival),
    route.distanceKm !== null && f.distance(route.distanceKm),
    route.batteryAtArrival !== null &&
      `${percent(route.batteryAtArrival)} on arrival`,
    (route.trafficDelayMin ?? 0) >= 1 &&
      `+${f.duration(route.trafficDelayMin)} traffic`,
  ]);
}

function mapPosition(
  view: LiveView,
  snapshot: { latitude: number | null; longitude: number | null },
  showMaps: boolean,
): OverviewLiveDriving["map"] {
  if (!showMaps) return null;
  const fromRoute = view.route;
  if (
    fromRoute?.latitude !== null &&
    fromRoute?.latitude !== undefined &&
    fromRoute.longitude !== null &&
    fromRoute.longitude !== undefined
  ) {
    return { latitude: fromRoute.latitude, longitude: fromRoute.longitude };
  }
  if (snapshot.latitude !== null && snapshot.longitude !== null) {
    return { latitude: snapshot.latitude, longitude: snapshot.longitude };
  }
  return null;
}

function speedStat(
  view: NonNullable<LiveView["driving"]>,
  f: Formatter,
): AppStat {
  const power = view.powerKw === null ? null : `${f.number(view.powerKw)} kW`;
  return appStat(
    "Speed",
    view.speedKmh === null ? "—" : f.speed(view.speedKmh),
    { detail: power },
  );
}

function liveTileRow(
  tile: ReturnType<typeof liveTiles>[number],
): OverviewLiveTile {
  return {
    key: tile.key,
    icon: tile.icon,
    title: tile.title,
    detail: tile.detail,
    tone: tile.tone,
    fullAt: tile.fullAt?.toISOString() ?? null,
  };
}

export function liveDrivingLayout(
  view: LiveView,
  f: Formatter,
  snapshot: { latitude: number | null; longitude: number | null },
  showMaps: boolean,
): OverviewLiveDriving | null {
  if (liveActivity(view.state) !== "driving" || !view.driving) return null;
  const route = view.route;
  return {
    map: mapPosition(view, snapshot, showMaps),
    speed: speedStat(view.driving, f),
    destination: route
      ? { title: route.destination, detail: routeDetail(route, f) }
      : null,
    tiles: liveTiles(view, f)
      .filter((tile) => tile.key !== "driving" && tile.key !== "route")
      .map(liveTileRow),
  };
}
