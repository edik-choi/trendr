import * as WebBrowser from "expo-web-browser";
import { ScrollView, Switch, Text, View } from "react-native";
import { GEOS } from "../../shared/trends.ts";
import { PRIVACY_URL, type Me } from "./api";
import { countryName, t } from "./i18n";
import { Button, Card, Chip, color, s } from "./ui";

type Props = {
  me: Me | null; // null: 아직 알림을 켠 적 없음
  home: string | null;
  onNotify: (on: boolean) => void;
  onAlertGeo: (geo: string) => void;
  onDelete: () => void;
};

export default function SettingsScreen({ me, home, onNotify, onAlertGeo, onDelete }: Props) {
  const geos = [...new Set([...(home ? [home] : []), ...(me ? [me.geo] : []), ...GEOS])];
  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.h2}>{t.notify}</Text>
            <Text style={[s.sub, { marginTop: 4 }]}>{t.notifyDesc}</Text>
          </View>
          <Switch
            value={!!me?.notify}
            onValueChange={onNotify}
            trackColor={{ true: color.ink, false: color.hairline }}
            thumbColor={color.canvas}
            accessibilityLabel={t.notify}
          />
        </View>
      </Card>

      {me?.notify && (
        <>
          <Text style={s.section}>{t.alertCountry}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {geos.map((g) => (
              <Chip key={g} label={countryName(g)} on={g === me.geo} onPress={() => onAlertGeo(g)} />
            ))}
          </View>
        </>
      )}

      <View style={{ marginTop: 32 }}>
        <Button title={t.privacy} kind="soft" onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)} />
        {me && <Button title={t.deleteData} kind="danger" onPress={onDelete} />}
      </View>
    </ScrollView>
  );
}
