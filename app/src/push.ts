import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { t } from "./i18n";

// 앱이 켜져 있을 때 온 알림도 배너로 보여줌
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// 권한을 묻고(ask=false면 묻지 않고) Expo 푸시 토큰을 돌려줌. 거부·에뮬레이터·오류면 null.
export async function registerPush(ask = true): Promise<string | null> {
  if (!Device.isDevice) return null;
  // Android 13+는 채널이 있어야 권한 요청 창이 뜸. 서버가 보내는 channelId와 같아야 함.
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("trends", {
      name: t.channel,
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted" && ask) ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== "granted") return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn("EAS projectId 없음: app 폴더에서 `npx eas-cli@latest init` 실행 필요");
    return null;
  }
  try {
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (e) {
    console.warn("푸시 토큰 발급 실패", e);
    return null;
  }
}
