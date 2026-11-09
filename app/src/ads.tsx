import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import * as Updates from "expo-updates";
import { useEffect, useRef } from "react";

const today = () => new Date().toDateString();
import { Platform, View } from "react-native";
import { BannerAd, BannerAdSize, TestIds, useInterstitialAd } from "react-native-google-mobile-ads";

// app.json extra.admob 에 실제 광고 단위 ID를 넣기 전까지, 개발 중, production 채널이 아닌 빌드(preview 테스트)는 항상 테스트 광고
// 실제 광고를 테스트 기기에서 보면 애드몹 무효 트래픽으로 계정 정지 위험
const ids: Record<string, string> = Constants.expoConfig?.extra?.admob ?? {};
const unit = (kind: "Banner" | "Interstitial", test: string) => {
  const real = ids[`${Platform.OS}${kind}`];
  return __DEV__ || !real || Updates.channel !== "production" ? test : real;
};

// 스토어 스크린샷용: EXPO_PUBLIC_HIDE_ADS=1 로 preview 업데이트를 보내면 광고를 숨김. production 채널에선 무시
const HIDE_ADS = process.env.EXPO_PUBLIC_HIDE_ADS === "1" && Updates.channel !== "production";

export function Banner() {
  if (HIDE_ADS) return null;
  return (
    <View style={{ alignItems: "center" }}>
      <BannerAd unitId={unit("Banner", TestIds.ADAPTIVE_BANNER)} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
}

// 기사를 열 때 전면 광고. 너무 자주 뜨면 이탈하니 3분에 한 번만.
const MIN_GAP_MS = 3 * 60 * 1000;
let lastShown = 0;

// 첫 실행 날엔 전면 광고 없이. 첫 경험이 광고면 이탈하니까. 날짜를 못 읽었으면(null) 광고도 쉼
const FIRST_DAY_KEY = "first_open_day";
let firstDay: string | null = null;
SecureStore.getItemAsync(FIRST_DAY_KEY)
  .then(async (d) => {
    firstDay = d ?? today();
    if (!d) await SecureStore.setItemAsync(FIRST_DAY_KEY, firstDay);
  })
  .catch(() => {});

export function useInterstitialBefore() {
  const { status, show, load } = useInterstitialAd({ adUnitId: unit("Interstitial", TestIds.INTERSTITIAL) });
  const pending = useRef<(() => void) | null>(null);
  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    if (status === "closed" || status === "error") {
      pending.current?.();
      pending.current = null;
      load();
    }
  }, [status, load]);

  // 광고가 준비돼 있으면 보여준 뒤 then 실행, 아니면 바로 실행
  return (then: () => void) => {
    if (!HIDE_ADS && status === "loaded" && firstDay && firstDay !== today() && Date.now() - lastShown > MIN_GAP_MS) {
      lastShown = Date.now();
      pending.current = then;
      show();
      // show가 조용히 실패하면 광고 없이 그대로 진행
      setTimeout(() => {
        if (pending.current === then && statusRef.current !== "showing") {
          pending.current = null;
          then();
        }
      }, 1500);
    } else {
      then();
    }
  };
}
