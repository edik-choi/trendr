import { registerRootComponent } from "expo";
import { Platform } from "react-native";
import { registerWidgetTaskHandler } from "react-native-android-widget";
import App from "./src/App";
import { widgetTaskHandler } from "./src/widget";

registerRootComponent(App);
// 홈 화면 위젯(안드로이드): 앱이 꺼져 있어도 위젯 갱신 요청을 받아 그림
if (Platform.OS === "android") registerWidgetTaskHandler(widgetTaskHandler);
