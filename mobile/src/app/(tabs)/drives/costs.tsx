import type { PeriodId } from "@contract";
import { Stack } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useCosts } from "@/api/queries";
import { useCar } from "@/car/car-provider";
import { InsightBody, PeriodControl } from "@/components/insight-body";
import { Notice } from "@/components/notice";
import { QueryView } from "@/components/query-view";
import { Screen } from "@/components/screen";
import { useRefresh } from "@/hooks/use-refresh";
import { space } from "@/theme/tokens";

export default function CostsScreen() {
  const { car } = useCar();
  const [period, setPeriod] = useState<PeriodId | null>(null);
  const costs = useCosts(car.id, period);
  const refresh = useRefresh(costs);
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}>
      <Stack.Screen options={{ title: "Costs" }} />
      <QueryView query={costs}>
        {(page) => (
          <View style={styles.body}>
            {page.notices.length > 0 ? (
              <View style={styles.notices}>
                {page.notices.map((notice) => (
                  <Notice key={notice} text={notice} />
                ))}
              </View>
            ) : null}
            <InsightBody
              subtitle={page.subtitle}
              hero={page.hero}
              heroBlocks={page.heroBlocks}
              sections={page.sections}
              stack="drives"
              period={<PeriodControl page={page} onChange={setPeriod} />}
              dimmed={costs.isPlaceholderData}
            />
          </View>
        )}
      </QueryView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.md },
  notices: { gap: space.sm },
});
