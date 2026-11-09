import * as Sharing from "expo-sharing";
import { useEffect, useRef, useState, type ComponentRef } from "react";
import { Image, Share, StyleSheet, Text, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import type { Trend } from "../../shared/trends.ts";
import { countryName, fmt, locale, t } from "./i18n";

// 공유 카드: 화면 밖에 카드를 그려 이미지(1080×1350, 인스타 4:5)로 캡처한 뒤 시스템 공유창으로 보냄.
// 테마와 상관없이 항상 어두운 카드(SNS 피드에서 눈에 띄게). 실패하면 텍스트 공유로 대신함.

type Content =
  | { kind: "trend"; geo: string; trend: Trend; rank: number | null }
  | { kind: "top"; geo: string; trends: Trend[] };

const W = 360; // 캡처 배율 3 → 1080
const H = 450;
const searchUrl = (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;

function fallbackText(c: Content) {
  if (c.kind === "trend") return `${c.trend.title}\n${fmt(t.shareText, countryName(c.geo))}\n${searchUrl(c.trend.title)}`;
  return `${fmt(t.cardTop, countryName(c.geo))}\n${c.trends.slice(0, 5).map((x, i) => `${i + 1}. ${x.title}`).join("\n")}\n— Trendr`;
}

export function useShareCard() {
  const [content, setContent] = useState<Content | null>(null);
  const [ready, setReady] = useState(false);
  const ref = useRef<ComponentRef<typeof View>>(null);

  // 이미지가 있으면 로드(또는 실패)를 기다리고, 없으면 바로. 2초 넘으면 그냥 캡처
  useEffect(() => {
    if (!content) return;
    const hasPicture = content.kind === "trend" && !!content.trend.picture;
    if (!hasPicture) setReady(true);
    const timer = setTimeout(() => setReady(true), 2000);
    return () => clearTimeout(timer);
  }, [content]);

  useEffect(() => {
    if (!content || !ready) return;
    (async () => {
      try {
        if (!(await Sharing.isAvailableAsync())) throw new Error("sharing unavailable");
        const uri = await captureRef(ref, { format: "png", width: W * 3, height: H * 3, result: "tmpfile" });
        await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: t.share });
      } catch (e) {
        console.warn("share card", e);
        await Share.share({ message: fallbackText(content) }).catch(() => {});
      } finally {
        setContent(null);
        setReady(false);
      }
    })();
  }, [content, ready]);

  const element = content ? (
    <View style={st.offscreen} pointerEvents="none">
      <View ref={ref} collapsable={false} style={st.card}>
        <Card content={content} onImage={() => setReady(true)} />
      </View>
    </View>
  ) : null;

  return {
    element,
    shareTrend: (geo: string, trend: Trend, rank: number | null) => setContent({ kind: "trend", geo, trend, rank }),
    shareTop: (geo: string, trends: Trend[]) => setContent({ kind: "top", geo, trends }),
  };
}

function today() {
  try {
    return new Date().toLocaleString(locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return new Date().toISOString().slice(0, 16).replace("T", " ");
  }
}

function Card({ content, onImage }: { content: Content; onImage: () => void }) {
  return (
    <>
      <View style={st.header}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Image source={require("../assets/icon.png")} style={st.logo} />
          <Text style={st.brand}>Trendr</Text>
        </View>
        <Text style={st.dim}>{today()}</Text>
      </View>

      {content.kind === "trend" ? (
        <View style={{ flex: 1 }}>
          {!!content.trend.picture && (
            <Image source={{ uri: content.trend.picture }} style={st.picture} onLoad={onImage} onError={onImage} />
          )}
          <Text style={st.heading}>{fmt(t.cardHeading, countryName(content.geo))}</Text>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 6 }}>
            {content.rank && <Text style={st.rankBig}>{content.rank}</Text>}
            <Text style={st.title} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.6}>
              {content.trend.title}
            </Text>
          </View>
          {!!content.trend.traffic && <Text style={[st.dim, { marginTop: 6 }]}>{fmt(t.searches, content.trend.traffic)}</Text>}
          {content.trend.news[0] && (
            <Text style={st.news} numberOfLines={content.trend.picture ? 2 : 4}>
              {content.trend.news[0].title}
            </Text>
          )}
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <Text style={[st.heading, { marginBottom: 12 }]}>{fmt(t.cardTop, countryName(content.geo))}</Text>
          {content.trends.slice(0, 5).map((x, i) => (
            <View key={x.title} style={st.row}>
              <Text style={st.rank}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={st.rowTitle} numberOfLines={1}>{x.title}</Text>
                {!!x.traffic && <Text style={st.dim}>{fmt(t.searches, x.traffic)}</Text>}
              </View>
            </View>
          ))}
        </View>
      )}

      <Text style={st.footer}>{t.cardFooter}</Text>
    </>
  );
}

const INK = "#141414";
const WHITE = "#ffffff";
const DIM = "#9a9a9a";
const ACCENT = "#6aa6ff";

const st = StyleSheet.create({
  offscreen: { position: "absolute", left: -10000, top: 0 },
  card: { width: W, height: H, backgroundColor: INK, padding: 22 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  logo: { width: 22, height: 22, borderRadius: 6 },
  brand: { color: WHITE, fontSize: 16, fontWeight: "700" },
  dim: { color: DIM, fontSize: 12, lineHeight: 16 },
  picture: { width: "100%", height: 150, borderRadius: 14, marginBottom: 14, backgroundColor: "#262626" },
  heading: { color: ACCENT, fontSize: 13, fontWeight: "700" },
  rankBig: { color: ACCENT, fontSize: 34, fontWeight: "800", lineHeight: 38 },
  title: { flex: 1, color: WHITE, fontSize: 30, fontWeight: "800", lineHeight: 36 },
  news: { color: "#d0d0d0", fontSize: 13, lineHeight: 18, marginTop: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#333" },
  rank: { width: 22, color: ACCENT, fontSize: 20, fontWeight: "800", textAlign: "center" },
  rowTitle: { color: WHITE, fontSize: 18, fontWeight: "700" },
  footer: { color: DIM, fontSize: 12, textAlign: "center", marginTop: 8 },
});
