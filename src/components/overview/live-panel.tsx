import {
  BadgeCheck,
  CircleAlert,
  DoorClosed,
  DoorOpen,
  Download,
  Fan,
  Gauge,
  Lock,
  LockOpen,
  Navigation,
  Plug,
  PlugZap,
  ShieldCheck,
  ShieldOff,
  Unplug,
  type LucideIcon,
} from "lucide-react";
import { ChargeCountdown } from "@/components/charge-countdown";
import { LiveStream } from "@/components/live-stream";
import type { Formatter } from "@/lib/format";
import type { LiveFeed } from "@/lib/live/live";
import type { LiveIcon, LiveTone } from "@/lib/app/contract";
import { liveNotices, liveTiles, type LiveTile } from "@/lib/live/tiles";
import { cn } from "@/lib/utils";

const icons: Record<LiveIcon, LucideIcon> = {
  lock: Lock,
  "lock-open": LockOpen,
  "door-closed": DoorClosed,
  "door-open": DoorOpen,
  plug: Plug,
  "plug-zap": PlugZap,
  unplug: Unplug,
  fan: Fan,
  "badge-check": BadgeCheck,
  download: Download,
  gauge: Gauge,
  navigation: Navigation,
  shield: ShieldCheck,
  "shield-off": ShieldOff,
};

const toneClass: Record<LiveTone, string> = {
  normal: "text-muted-foreground",
  active: "text-primary",
  charge: "text-charge",
  warning: "text-warning",
};

function Tile({ tile, now }: { tile: LiveTile; now: Date }) {
  const Icon = icons[tile.icon];
  return (
    <div className="flex min-w-0 gap-3">
      <Icon
        aria-hidden
        className={cn("mt-0.5 size-5 shrink-0", toneClass[tile.tone])}
      />
      <div className="min-w-0">
        <p className="truncate font-medium">{tile.title}</p>
        {tile.detail && (
          <p className="mt-0.5 truncate text-sm text-subtle tabular">
            {tile.detail}
          </p>
        )}
        {tile.fullAt && (
          <p className="mt-0.5 truncate text-sm text-subtle">
            <ChargeCountdown
              fullAt={tile.fullAt.getTime()}
              renderedAt={now.getTime()}
            />
          </p>
        )}
      </div>
    </div>
  );
}

export function LivePanel({
  carId,
  carName,
  feed,
  f,
  now,
  className,
  variant = "card",
}: {
  carId: number;
  carName: string;
  feed: LiveFeed;
  f: Formatter;
  now: Date;
  className?: string;
  variant?: "card" | "rail";
}) {
  const tiles = liveTiles(feed.view, f).filter((tile) => tile.key !== "lock");
  const alerts = liveNotices(feed);
  const rail = variant === "rail";

  return (
    <section
      className={cn(
        !rail && "rounded-xl bg-card p-5",
        rail && "min-w-0",
        className,
      )}
    >
      <LiveStream carId={carId} />
      <header className="flex items-center justify-between gap-4">
        <h2 className="text-sm text-muted-foreground">Live</h2>
        <p className="flex items-center gap-2 text-xs text-subtle">
          <span
            className={cn(
              "size-1.5 rounded-full",
              feed.connected ? "bg-charge" : "bg-subtle",
            )}
          />
          {feed.connected ? "Connected" : "Offline"}
        </p>
      </header>
      {feed.hasValues && tiles.length > 0 ? (
        <div
          className={cn(
            "mt-4",
            rail
              ? "flex flex-col gap-y-5"
              : "grid grid-cols-1 gap-y-5 sm:grid-cols-2",
          )}
        >
          {tiles.map((tile) => (
            <Tile tile={tile} now={now} key={tile.key} />
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-subtle">
          No live values yet. TeslaMate sends them when {carName} is online.
        </p>
      )}
      {alerts.length > 0 && (
        <ul
          className={cn(
            "mt-5 space-y-2",
            !rail && "border-t border-border pt-4",
            rail && "border-t border-border/60 pt-4",
          )}
        >
          {alerts.map((alert) => (
            <li key={alert} className="flex items-start gap-2 text-sm">
              <CircleAlert
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-warning"
              />
              {alert}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
