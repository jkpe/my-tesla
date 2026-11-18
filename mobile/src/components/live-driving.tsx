import type { OverviewPage } from "@contract";
import { StyleSheet, View } from "react-native";
import { chargeLeftText } from "@/format";
import { useNow } from "@/hooks/use-now";
import { space } from "@/theme/tokens";
import { liveToneColor } from "@/theme/tones";
import { usePalette } from "@/theme/use-palette";
import { Icon } from "./icon";
import { liveIcons } from "./icons";
import { LocationMap } from "./map";
import { Notice } from "./notice";
import { Stat } from "./stat";
import { Text } from "./text";

const countdownMs = 15_000;

export function LiveDriving({
  live,
  carName,
}: {
  live: NonNullable<OverviewPage["live"]>;
  carName: string;
}) {
  const palette = usePalette();
  const now = useNow(countdownMs);
  const driving = live.driving;
  if (!driving) return null;
  const destinationLabel = driving.destination
    ? ["Destination", driving.destination.title, driving.destination.detail]
        .filter(Boolean)
        .join(", ")
    : "Destination, none";

  return (
    <View style={styles.block}>
      <View style={styles.header}>
        <Text variant="label" tone="subtle" accessibilityRole="header">
          Live
        </Text>
        <View style={styles.status}>
          <View
            style={[
              styles.dot,
              {
                backgroundColor: live.connected
                  ? palette.charge
                  : palette.subtle,
              },
            ]}
          />
          <Text variant="caption" tone="subtle">
            {live.connected ? "Connected" : "Offline"}
          </Text>
        </View>
      </View>
      {live.empty ? (
        <Text variant="label" tone="subtle">
          {live.empty}
        </Text>
      ) : (
        <>
          {driving.map ? (
            <LocationMap
              size="card"
              latitude={driving.map.latitude}
              longitude={driving.map.longitude}
              label={`Map of where ${carName} is`}
            />
          ) : null}
          <View style={styles.hero}>
            <View style={styles.heroCol}>
              <Stat stat={driving.speed} size="title" />
            </View>
            <View
              accessible
              accessibilityLabel={destinationLabel}
              style={styles.heroCol}
            >
              <Text variant="label">Destination</Text>
              {driving.destination ? (
                <>
                  <Text variant="title" numberOfLines={2}>
                    {driving.destination.title}
                  </Text>
                  {driving.destination.detail ? (
                    <Text variant="caption" numberOfLines={2}>
                      {driving.destination.detail}
                    </Text>
                  ) : null}
                </>
              ) : (
                <Text variant="title" tone="subtle">
                  —
                </Text>
              )}
            </View>
          </View>
          {driving.tiles.length ? (
            <View style={styles.tiles}>
              {driving.tiles.map((tile) => {
                const left = chargeLeftText(tile.fullAt, now);
                return (
                  <View
                    key={tile.key}
                    accessible
                    accessibilityLabel={[tile.title, tile.detail, left]
                      .filter(Boolean)
                      .join(", ")}
                    style={styles.tile}
                  >
                    <Icon
                      name={liveIcons[tile.icon]}
                      color={liveToneColor(palette, tile.tone)}
                    />
                    <View style={styles.tileText}>
                      <Text variant="strong" numberOfLines={1}>
                        {tile.title}
                      </Text>
                      {tile.detail ? (
                        <Text variant="caption" numberOfLines={2}>
                          {tile.detail}
                        </Text>
                      ) : null}
                      {left ? (
                        <Text variant="caption" tone="charge">
                          {left}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}
        </>
      )}
      {live.notices.map((notice) => (
        <Notice key={notice} text={notice} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.lg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
  },
  status: { flexDirection: "row", alignItems: "center", gap: space.sm },
  dot: { width: 6, height: 6, borderRadius: 3 },
  hero: { flexDirection: "row", gap: space.xl },
  heroCol: { flex: 1, minWidth: 0, gap: 2 },
  tiles: { gap: space.md },
  tile: { flexDirection: "row", gap: space.md, alignItems: "flex-start" },
  tileText: { flex: 1, minWidth: 0, gap: 2 },
});
