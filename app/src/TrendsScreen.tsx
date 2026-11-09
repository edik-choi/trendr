import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useRef, useState, type ComponentRef, type ReactNode } from "react";
import { FlatList, Image, type LayoutChangeEvent, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import type { Trend } from "../../shared/trends.ts";
import { useInterstitialBefore } from "./ads";
import { getTrends, type TrendList } from "./api";
import { ago, countryName, fmt, t } from "./i18n";
import { useShareCard } from "./share";
import { updateWidget } from "./widget";
import { Button, Chip, color, Empty, radius, s, Skeleton } from "./ui";

type Props = {
  geo: string | null; // null: 서버가 기기 나라로 정함
  onGeo: (geo: string, home: string | null) => void;
  refreshKey: number;
  header?: ReactNode; // 알림 권유 카드
  onOpen: (geo: string, trend: Trend, rank: number) => void; // 상세 화면 열기
};

export default function TrendsScreen({ geo, onGeo, refreshKey, header, onOpen }: Props) {
  const [data, setData] = useState<TrendList | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const withAd = useInterstitialBefore();
  const chips = useRef<ComponentRef<typeof ScrollView>>(null);
  const card = useShareCard();

  const load = useCallback(async () => {
    setError(false);
    try {
      const d = await getTrends(geo ?? undefined);
      if (!d) throw new Error("404");
      setData(d);
      updateWidget(d.geo, d.trends, d.updated);
      if (d.geo !== geo) onGeo(d.geo, d.home);
    } catch (e) {
      console.warn("trends", e); // 원인은 Worker 로그에 남음
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
        <Text style={[s.sub, { textAlign: "center", marginTop: 4 }]}>{t.errorHint}</Text>
        <Button title={t.retry} kind="outline" onPress={load} />
      </View>
    );
  }
  if (!data) return <View style={{ padding: 20 }}><Skeleton /></View>;
  // 나라를 바꾼 직후: 새 목록이 올 때까지 예전 목록 대신 로딩 표시
  const switching = !!geo && geo !== data.geo && !error;

  return (
    <View style={{ flex: 1 }}>
    {card.element}
    <FlatList
      data={switching ? [] : data.trends}
      keyExtractor={(k) => k.title}
      contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.ink} />}
      ListHeaderComponent={
        <>
          <View style={st.head}>
            <Text style={[s.h1, { marginBottom: 0 }]}>Trendr</Text>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 12 }}>
              {!!data.updated && !switching && <Text style={s.sub}>{fmt(t.updated, ago(data.updated))}</Text>}
              {!switching && data.trends.length > 0 && (
                <Pressable onPress={() => card.shareTop(data.geo, data.trends)} accessibilityRole="button" accessibilityLabel={t.shareTop} hitSlop={10}>
                  <Text style={[s.body, { fontWeight: "600" }]}>{t.share}</Text>
                </Pressable>
              )}
            </View>
          </View>
          <ScrollView ref={chips} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
            {geos.map((g) => {
              const on = g === (geo ?? data.geo);
              // 처음 그릴 때 선택된 나라가 화면 밖이면 보이게 스크롤
              const show = on ? (e: LayoutChangeEvent) => chips.current?.scrollTo({ x: Math.max(0, e.nativeEvent.layout.x - 20), animated: false }) : undefined;
              return (
                <View key={g} onLayout={show}>
                  <Chip label={countryName(g)} on={on} onPress={() => onGeo(g, data.home)} />
                </View>
              );
            })}
          </ScrollView>
          {header}
          {error && <Text style={s.error}>{t.error}</Text>}
        </>
      }
      ListEmptyComponent={switching ? <Skeleton /> : <Empty>{t.empty}</Empty>}
      ListFooterComponent={<Text style={[s.sub, { marginTop: 16 }]}>{t.source}</Text>}
      ItemSeparatorComponent={({ leadingItem }) => (data.trends.indexOf(leadingItem) < 3 ? null : <View style={s.divider} />)}
      renderItem={({ item, index }) => (
        <Row
          trend={item}
          rank={index + 1}
          onOpen={() => withAd(() => onOpen(data.geo, item, index + 1))}
          onNews={(url) => withAd(() => WebBrowser.openBrowserAsync(url))}
        />
      )}
    />
    </View>
  );
}

// 상위 3개(푸시로 보내는 것)는 이미지 카드, 나머지는 한 줄. 줄 어디를 눌러도 상세 화면, 뉴스 줄만 기사
function Row({ trend, rank, onOpen, onNews }: { trend: Trend; rank: number; onOpen: () => void; onNews: (url: string) => void }) {
  const news = trend.news[0];
  const meta = [trend.traffic && fmt(t.searches, trend.traffic), trend.date > 0 && ago(trend.date)].filter(Boolean).join(" · ");
  const top = rank <= 3;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${rank}. ${trend.title}`}
      onPress={onOpen}
      style={({ pressed }) => [top ? st.card : st.row, pressed && { opacity: 0.7 }]}
    >
      {top && !!trend.picture && <Image source={{ uri: trend.picture }} style={st.picture} accessibilityIgnoresInvertColors />}
      <View style={top ? st.cardBody : st.rowBody}>
        <Text style={[st.rank, top && st.rankTop]}>{rank}</Text>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={top ? [s.h2, { fontSize: 20, lineHeight: 26 }] : s.h2}>{trend.title}</Text>
          {!!meta && <Text style={s.sub}>{meta}</Text>}
          {news && (
            <Pressable accessibilityRole="link" onPress={() => onNews(news.url)} hitSlop={8} style={{ paddingVertical: 4 }}>
              <Text style={[s.sub, { color: color.inkSoft }]} numberOfLines={2}>
                {news.title}
                {news.source ? ` · ${news.source}` : ""}
              </Text>
            </Pressable>
          )}
        </View>
        {!top && <Text style={st.chevron}>›</Text>}
      </View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 },
  card: { backgroundColor: color.soft, borderRadius: radius.md, overflow: "hidden", marginBottom: 12 },
  picture: { width: "100%", aspectRatio: 16 / 9, backgroundColor: color.hairline },
  cardBody: { flexDirection: "row", gap: 14, padding: 16 },
  row: { paddingVertical: 14 },
  rowBody: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  rank: { width: 26, fontSize: 18, fontWeight: "700", lineHeight: 24, color: color.accent, textAlign: "center" },
  rankTop: { fontSize: 22, lineHeight: 26 },
  chevron: { fontSize: 22, lineHeight: 24, color: color.faint },
});
