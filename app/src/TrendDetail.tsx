import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { Trend } from "../../shared/trends.ts";
import { getTrendDetail, type TrendDetail as Detail } from "./api";
import { ago, countryName, fmt, t } from "./i18n";
import { useShareCard } from "./share";
import { Button, color, radius, s, Skeleton } from "./ui";

type Props = {
  geo: string;
  trend: Trend; // 목록에서 넘겨받은 항목: 상세를 불러오는 동안에도 바로 보여줌
  rank: number | null; // 위젯·링크로 열면 모름(상세를 받으면 채워짐)
  onClose: () => void;
  onGeo: (geo: string) => void; // "다른 나라에서도" 칩 → 그 나라 목록으로
};

const search = (q: string) => WebBrowser.openBrowserAsync(`https://www.google.com/search?q=${encodeURIComponent(q)}`);

export default function TrendDetail({ geo, trend: initial, rank: initialRank, onClose, onGeo }: Props) {
  const [d, setD] = useState<Detail | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getTrendDetail(geo, initial.title).then(setD, () => setFailed(true));
  }, [geo, initial.title]);

  const trend = d?.trend ?? initial;
  const rank = d ? d.rank : initialRank;
  const ep = d?.episodes[0];
  const meta = [
    rank ? fmt(t.rankNow, rank) : t.offList,
    trend.traffic && fmt(t.searches, trend.traffic),
    ep && ep.hours > 1 && fmt(t.trendingHours, ep.hours),
  ].filter(Boolean).join(" · ");

  const card = useShareCard();
  const share = () => card.shareTrend(geo, trend, rank);

  return (
    <View style={{ flex: 1 }}>
    {card.element}
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={st.top}>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t.back} hitSlop={12} style={st.back}>
          <Text style={st.backText}>‹ {t.back}</Text>
        </Pressable>
        <Pressable onPress={share} accessibilityRole="button" hitSlop={12}>
          <Text style={[s.body, { fontWeight: "600" }]}>{t.share}</Text>
        </Pressable>
      </View>

      {!!trend.picture && <Image source={{ uri: trend.picture }} style={st.picture} accessibilityIgnoresInvertColors />}

      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <Text style={s.sub}>{countryName(geo)}</Text>
        <Text style={[s.h1, { marginTop: 4, marginBottom: 6 }]}>{trend.title}</Text>
        <Text style={s.sub}>{meta}</Text>
        <View style={{ marginTop: 12 }}>
          <Button title={t.searchOn} onPress={() => search(trend.title)} />
        </View>

        <Text style={s.section}>{t.rankChart}</Text>
        {!d && !failed ? <Skeleton /> : <RankChart points={d?.points ?? []} />}

        <Text style={s.section}>{t.elsewhere}</Text>
        {!d && !failed ? null : d?.elsewhere.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {d.elsewhere.map((e) => (
              <Pressable key={e.geo} onPress={() => onGeo(e.geo)} style={st.pill} accessibilityRole="button">
                <Text style={s.body}>{countryName(e.geo)}</Text>
                <Text style={s.sub}>{ago(e.first_seen)}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={s.sub}>{t.elsewhereNone}</Text>
        )}

        {trend.news.length > 0 && <Text style={s.section}>{t.news}</Text>}
        {trend.news.map((n) => (
          <Pressable
            key={n.url}
            accessibilityRole="link"
            onPress={() => WebBrowser.openBrowserAsync(n.url)}
            style={({ pressed }) => [st.news, pressed && { opacity: 0.7 }]}
          >
            <Text style={[s.body, { fontWeight: "600" }]} numberOfLines={3}>{n.title}</Text>
            {!!n.source && <Text style={[s.sub, { marginTop: 4 }]}>{n.source}</Text>}
          </Pressable>
        ))}
      </View>
    </ScrollView>
    </View>
  );
}

// 시간별 순위 막대. 1위가 가장 높음. 차트 라이브러리 없이 View로
function RankChart({ points }: { points: Detail["points"] }) {
  if (points.length < 2) return <Text style={s.sub}>{t.chartEmpty}</Text>;
  const worst = Math.max(10, ...points.map((p) => p.rank));
  return (
    <View>
      <View style={st.chart} accessibilityLabel={t.rankChart}>
        {points.map((p) => (
          <View key={p.ts} style={[st.bar, { height: `${((worst - p.rank + 1) / worst) * 100}%` }]} />
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
        <Text style={s.sub}>{ago(points[0].ts)}</Text>
        <Text style={s.sub}>{fmt(t.rankNow, points[points.length - 1].rank)}</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12 },
  back: { paddingVertical: 4 },
  backText: { fontSize: 17, fontWeight: "600", color: color.ink },
  picture: { width: "100%", aspectRatio: 16 / 9, backgroundColor: color.hairline },
  chart: { height: 96, flexDirection: "row", alignItems: "flex-end", gap: 2, backgroundColor: color.soft, borderRadius: radius.sm, padding: 8 },
  bar: { flex: 1, minHeight: 2, backgroundColor: color.accent, borderRadius: 2 },
  pill: { backgroundColor: color.soft, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8 },
  news: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.hairline },
});
