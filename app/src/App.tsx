import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { Alert, BackHandler, Linking, Text, View } from "react-native";
import mobileAds from "react-native-google-mobile-ads";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Banner } from "./ads";
import { deleteMe, getMe, saveMe, type Me } from "./api";
import { deviceTz, locale, localeGeo, t } from "./i18n";
import { registerPush } from "./push";
import { GEO_KEY } from "./widget";
import SettingsScreen from "./SettingsScreen";
import TrendDetail from "./TrendDetail";
import TrendsScreen from "./TrendsScreen";
import type { Trend } from "../../shared/trends.ts";
import { Button, Card, color, isDark, s, Segmented } from "./ui";

mobileAds().initialize();

type Tab = "trends" | "settings";
const ASKED_KEY = "asked_push"; // 알림 권유 카드를 닫았는지

const tryOrAlert = (f: () => Promise<void>) =>
  f().catch((e) => Alert.alert(t.errorTitle, e instanceof Error ? e.message : String(e)));

export default function App() {
  const [tab, setTab] = useState<Tab>("trends");
  const [geo, setGeo] = useState<string | null | undefined>(undefined); // undefined: 저장값 읽는 중
  const [home, setHome] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [asked, setAsked] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  // 검색어 상세: 탭 위에 열림. 안드로이드 뒤로 가기로 닫힘
  const [detail, setDetail] = useState<{ geo: string; trend: Trend; rank: number | null } | null>(null);
  // 위젯 줄 누르기 등 trendr://trend?geo=KR&q=검색어 → 상세 화면
  useEffect(() => {
    const open = (url?: string | null) => {
      const m = url?.match(/^trendr:\/\/trend\?(.*)$/);
      if (!m) return;
      // RN의 URLSearchParams.get은 구현이 불완전해서 직접 나눔
      const q = Object.fromEntries(m[1].split("&").map((kv) => kv.split("=").map((x) => decodeURIComponent(x.replace(/\+/g, " ")))));
      const g = q.geo;
      const title = q.q;
      if (g && title) setDetail({ geo: g, trend: { title, traffic: "", date: 0, news: [] }, rank: null });
    };
    Linking.getInitialURL().then(open, () => {});
    const sub = Linking.addEventListener("url", (e) => open(e.url));
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (!detail) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => (setDetail(null), true));
    return () => sub.remove();
  }, [detail]);

  useEffect(() => {
    SecureStore.getItemAsync(GEO_KEY).then((g) => setGeo(g), () => setGeo(null));
    SecureStore.getItemAsync(ASKED_KEY).then((a) => setAsked(!!a), () => {});
    (async () => {
      try {
        const m = await getMe();
        setMe(m);
        // 토큰·시간대가 바뀌었을 수 있어 실행할 때마다 조용히 갱신(권한은 다시 묻지 않음)
        if (m?.notify) {
          const token = await registerPush(false);
          if (token || m.tz !== deviceTz || m.locale !== locale) await saveMe({ ...m, locale, tz: deviceTz }, token);
        }
      } catch {
        setMe(null);
      }
    })();
  }, []);

  const onGeo = useCallback((g: string, h: string | null) => {
    setGeo(g);
    setHome(h);
    SecureStore.setItemAsync(GEO_KEY, g).catch(() => {});
  }, []);

  // 알림을 눌러 들어오면 그 나라 목록을 새로 불러옴
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const g = response?.notification.request.content.data?.geo;
    if (response?.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      setTab("trends");
      setDetail(null);
      if (typeof g === "string") onGeo(g, home);
      setRefreshKey((k) => k + 1);
    }
  }, [response]); // eslint-disable-line react-hooks/exhaustive-deps

  const dismissAsk = () => {
    setAsked(true);
    SecureStore.setItemAsync(ASKED_KEY, "1").catch(() => {});
  };

  // 알림 켜기/끄기. 알림 나라 기본값은 지금 보고 있는 나라
  const setNotify = (on: boolean, alertGeo = me?.geo ?? geo ?? home ?? localeGeo) =>
    tryOrAlert(async () => {
      dismissAsk();
      const token = on ? await registerPush(true) : null;
      if (on && !token && !me?.hasPushToken) {
        Alert.alert(t.notify, t.denied);
        return;
      }
      const next = { geo: alertGeo, locale, tz: deviceTz, notify: on };
      await saveMe(next, token);
      setMe({ ...next, hasPushToken: !!token || !!me?.hasPushToken });
    });

  const remove = () =>
    Alert.alert(t.deleteData, t.deleteConfirm, [
      { text: t.cancel, style: "cancel" },
      {
        text: t.delete,
        style: "destructive",
        onPress: () => tryOrAlert(async () => {
          await deleteMe();
          setMe(null);
          Alert.alert(t.deleted);
        }),
      },
    ]);

  const askCard = me === null && !asked ? (
    <Card>
      <Text style={s.h2}>{t.askTitle}</Text>
      <Text style={[s.sub, { marginTop: 4, marginBottom: 8 }]}>{t.askBody}</Text>
      <Button title={t.askYes} onPress={() => setNotify(true)} />
      <Button title={t.askNo} kind="outline" onPress={dismissAsk} />
    </Card>
  ) : undefined;

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? "light" : "dark"} />
      <SafeAreaView style={{ flex: 1, backgroundColor: color.canvas }} edges={["top", "bottom"]}>
        <View style={{ flex: 1 }}>
          {detail ? (
            <TrendDetail
              key={`${detail.geo}:${detail.trend.title}`}
              {...detail}
              onClose={() => setDetail(null)}
              onGeo={(g) => (setDetail(null), setTab("trends"), onGeo(g, home))}
            />
          ) : geo === undefined ? null : tab === "trends" ? (
            <TrendsScreen
              geo={geo}
              onGeo={onGeo}
              refreshKey={refreshKey}
              header={askCard}
              onOpen={(g, trend, rank) => setDetail({ geo: g, trend, rank })}
            />
          ) : (
            <SettingsScreen
              me={me ?? null}
              home={home}
              onNotify={(on) => setNotify(on)}
              onAlertGeo={(g) => setNotify(true, g)}
              onDelete={remove}
            />
          )}
        </View>
        <View style={{ paddingHorizontal: 20, paddingVertical: 4, display: detail ? "none" : "flex" }}>
          <Segmented dark items={[["trends", t.tabTrends], ["settings", t.tabSettings]]} value={tab} onChange={setTab} />
        </View>
        <Banner />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
