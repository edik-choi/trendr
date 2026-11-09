import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import type { Trend } from "../../shared/trends.ts";
import { useInterstitialBefore } from "./ads";
import { getTrends, type TrendList } from "./api";
import { ago, countryName, fmt, t } from "./i18n";
import { Button, Chip, color, Empty, Loading, s } from "./ui";

type Props = {
  geo: string | null; // null: 서버가 기기 나라로 정함
  onGeo: (geo: string, home: string | null) => void;
  refreshKey: number;
  header?: ReactNode; // 알림 권유 카드
};

export default function TrendsScreen({ geo, onGeo, refreshKey, header }: Props) {
  const [data, setData] = useState<TrendList | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const withAd = useInterstitialBefore();

  const load = useCallback(async () => {
    setError(false);
    try {
      const d = await getTrends(geo ?? undefined);
      if (!d) throw new Error();
      setData(d);
      if (d.geo !== geo) onGeo(d.geo, d.home);
    } catch {
      setError(true);
    }
  }, [geo, onGeo]);
  useEffect(() => { load(); }, [load, refreshKey]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // 기기 나라가 목록에 없어도 맨 앞에
  const geos = data ? [...new Set([...(data.home ? [data.home] : []), ...data.geos])] : [];

  if (!data && error) {
    return (
      <View style={s.center}>
        <Text style={[s.body, { textAlign: "center" }]}>{t.error}</Text>
        <Button title={t.retry} kind="outline" onPress={load} />
      </View>
    );
  }
  if (!data) return <Loading />;

  return (
    <FlatList
      data={data.trends}
      keyExtractor={(k) => k.title}
      contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.ink} />}
      ListHeaderComponent={
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
            {geos.map((g) => (
              <Chip key={g} label={countryName(g)} on={g === (geo ?? data.geo)} onPress={() => onGeo(g, data.home)} />
            ))}
          </ScrollView>
          {header}
          {error && <Text style={s.error}>{t.error}</Text>}
        </>
      }
      ListEmptyComponent={<Empty>{t.empty}</Empty>}
      ListFooterComponent={<Text style={[s.sub, { marginTop: 16 }]}>{t.source}</Text>}
      ItemSeparatorComponent={() => <View style={s.divider} />}
      renderItem={({ item, index }) => (
        <Row trend={item} rank={index + 1} onNews={(url) => withAd(() => WebBrowser.openBrowserAsync(url))} />
      )}
    />
  );
}

function Row({ trend, rank, onNews }: { trend: Trend; rank: number; onNews: (url: string) => void }) {
  const news = trend.news[0];
  const meta = [trend.traffic && fmt(t.searches, trend.traffic), trend.date > 0 && ago(trend.date)].filter(Boolean).join(" · ");
  return (
    <View style={st.row}>
      <Text style={st.rank}>{rank}</Text>
      <View style={{ flex: 1, gap: 4 }}>
        <Pressable
          accessibilityRole="link"
          onPress={() => WebBrowser.openBrowserAsync(`https://www.google.com/search?q=${encodeURIComponent(trend.title)}`)}
        >
          <Text style={s.h2}>{trend.title}</Text>
        </Pressable>
        {!!meta && <Text style={s.sub}>{meta}</Text>}
        {news && (
          <Pressable accessibilityRole="link" onPress={() => onNews(news.url)}>
            <Text style={[s.sub, { color: color.inkSoft }]} numberOfLines={2}>
              {news.title}
              {news.source ? ` · ${news.source}` : ""}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: "row", gap: 14, paddingVertical: 14 },
  rank: { width: 26, fontSize: 18, fontWeight: "700", lineHeight: 24, color: color.accent, textAlign: "center" },
});
