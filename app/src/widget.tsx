import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { FlexWidget, requestWidgetUpdate, TextWidget, type WidgetTaskHandler } from "react-native-android-widget";
import type { Trend } from "../../shared/trends.ts";
import { getTrends } from "./api";
import { countryName, fmt, t } from "./i18n";

// 안드로이드 홈 화면 위젯 "Top3": 마지막으로 본 나라의 상위 3개. 30분마다(안드로이드 최소 주기) + 앱에서 목록을 받을 때마다 갱신.
// 줄을 누르면 trendr://trend?geo=&q= 로 상세 화면, 나머지 영역은 앱 열기.
export const WIDGET_NAME = "Top3";
export const GEO_KEY = "geo"; // App.tsx와 같은 키: 마지막으로 본 나라

type Hex = `#${string}`;
type Palette = { bg: Hex; ink: Hex; muted: Hex; accent: Hex; line: Hex };
const LIGHT: Palette = { bg: "#ffffff", ink: "#141414", muted: "#6b6b6b", accent: "#005ef0", line: "#ececec" };
const DARK: Palette = { bg: "#161616", ink: "#f2f2f2", muted: "#9a9a9a", accent: "#6aa6ff", line: "#2a2a2a" };

const hhmm = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

function TopWidget({ geo, trends, updated, p }: { geo: string | null; trends: Trend[]; updated: number | null; p: Palette }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{ height: "match_parent", width: "match_parent", backgroundColor: p.bg, borderRadius: 22, padding: 14, flexDirection: "column" }}
    >
      <FlexWidget style={{ width: "match_parent", flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <TextWidget text={geo ? `Trendr · ${countryName(geo)}` : "Trendr"} style={{ fontSize: 13, fontWeight: "700", color: p.ink }} maxLines={1} truncate="END" />
        {updated ? <TextWidget text={hhmm(updated)} style={{ fontSize: 12, color: p.muted }} /> : null}
      </FlexWidget>
      {trends.length === 0 ? (
        <TextWidget text={t.widgetOpen} style={{ fontSize: 14, color: p.muted }} />
      ) : (
        trends.slice(0, 3).map((x, i) => (
          <FlexWidget
            key={x.title}
            clickAction="OPEN_URI"
            clickActionData={{ uri: `trendr://trend?geo=${geo}&q=${encodeURIComponent(x.title)}` }}
            style={{
              width: "match_parent",
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 6,
              borderTopWidth: i ? 1 : 0,
              borderColor: p.line,
            }}
          >
            <TextWidget text={String(i + 1)} style={{ width: 22, fontSize: 16, fontWeight: "800", color: p.accent }} />
            <FlexWidget style={{ flex: 1, flexDirection: "column" }}>
              <TextWidget text={x.title} style={{ fontSize: 15, fontWeight: "700", color: p.ink }} maxLines={1} truncate="END" />
              {x.traffic ? <TextWidget text={fmt(t.searches, x.traffic)} style={{ fontSize: 11, color: p.muted }} /> : null}
            </FlexWidget>
          </FlexWidget>
        ))
      )}
    </FlexWidget>
  );
}

const render = (geo: string | null, trends: Trend[], updated: number | null) => ({
  light: <TopWidget geo={geo} trends={trends} updated={updated} p={LIGHT} />,
  dark: <TopWidget geo={geo} trends={trends} updated={updated} p={DARK} />,
});

// 위젯 혼자 깨어났을 때(추가·주기 갱신·크기 변경): 저장된 나라로 목록을 받아 그림. 실패하면 "눌러서 보기"
export const widgetTaskHandler: WidgetTaskHandler = async ({ widgetAction, renderWidget }) => {
  if (widgetAction === "WIDGET_DELETED" || widgetAction === "WIDGET_CLICK") return;
  let geo: string | null = null;
  try {
    geo = await SecureStore.getItemAsync(GEO_KEY);
    const d = await getTrends(geo ?? undefined);
    if (!d) throw new Error("404");
    renderWidget(render(d.geo, d.trends, d.updated ?? Date.now()));
  } catch {
    renderWidget(render(geo, [], null));
  }
};

// 앱에서 목록을 받았을 때 위젯도 같은 내용으로 바로 갱신(위젯이 없으면 아무 일 없음)
export function updateWidget(geo: string, trends: Trend[], updated?: number) {
  if (Platform.OS !== "android") return;
  requestWidgetUpdate({ widgetName: WIDGET_NAME, renderWidget: () => render(geo, trends, updated ?? Date.now()) }).catch(() => {});
}
