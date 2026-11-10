import * as WebBrowser from "expo-web-browser";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { GEOS, LOCALES, type Locale } from "../../shared/trends.ts";
import { PRIVACY_URL, type Me } from "./api";
import { countryName, langChoice, LANGUAGE_NAMES, t } from "./i18n";
import { Button, Card, Chip, color, s } from "./ui";

// 설정: 헤더의 설정 버튼으로 열림(탭 위, 안드로이드 뒤로 가기). 나라 하나로 목록·위젯·알림을 같이 정함
type Props = {
  me: Me | null; // null: 아직 알림을 켠 적 없음
  geo: string | null; // 지금 보는 나라
  home: string | null; // 기기가 있는 나라(목록에 없어도 맨 앞에)
  onGeo: (geo: string) => void;
  onLanguage: (l: Locale | null) => void;
  onNotify: (on: boolean) => void;
  onDelete: () => void;
  onClose: () => void;
};

export default function SettingsScreen({ me, geo, home, onGeo, onLanguage, onNotify, onDelete, onClose }: Props) {
  const geos = [...new Set([...(home ? [home] : []), ...(geo ? [geo] : []), ...GEOS])];
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t.back} hitSlop={12} style={{ alignSelf: "flex-start", paddingVertical: 4 }}>
          <Text style={{ fontSize: 17, fontWeight: "600", color: color.ink }}>‹ {t.back}</Text>
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        <Text style={s.h1}>{t.tabSettings}</Text>

        <Text style={s.section}>{t.country}</Text>
        <Text style={[s.sub, { marginTop: -6, marginBottom: 12 }]}>{t.countryDesc}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {geos.map((g) => (
            <Chip key={g} label={countryName(g)} on={g === geo} onPress={() => onGeo(g)} />
          ))}
        </View>

        <Text style={s.section}>{t.language}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Chip label={t.languageAuto} on={langChoice === null} onPress={() => onLanguage(null)} />
          {LOCALES.map((l) => (
            <Chip key={l} label={LANGUAGE_NAMES[l]} on={langChoice === l} onPress={() => onLanguage(l)} />
          ))}
        </View>

        <Text style={s.section}>{t.notify}</Text>
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Text style={[s.sub, { flex: 1 }]}>{t.notifyDesc}</Text>
            <Switch
              value={!!me?.notify}
              onValueChange={onNotify}
              trackColor={{ true: color.ink, false: color.hairline }}
              thumbColor={color.canvas}
              accessibilityLabel={t.notify}
            />
          </View>
        </Card>

        <View style={{ marginTop: 32 }}>
          <Button title={t.privacy} kind="soft" onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)} />
          {me && <Button title={t.deleteData} kind="danger" onPress={onDelete} />}
        </View>
      </View>
    </ScrollView>
  );
}
