import type { ReactNode } from "react";
import { ActivityIndicator, Appearance, Pressable, StyleSheet, Text, View } from "react-native";

// 청약시그널(DESIGN.md)과 같은 모노크롬 토큰. 파란 강조는 순위 숫자에만
const light = {
  ink: "#141414",
  inkSoft: "#262626",
  muted: "#6b6b6b", // DESIGN.md #707070은 회색 카드 위 4.46:1이라 4.5:1 넘게 살짝 진하게
  faint: "#adadad",
  canvas: "#ffffff",
  soft: "#f3f3f3",
  field: "#f0f0f0",
  hairline: "#e0e0e0",
  accent: "#005ef0", // DESIGN.md #0066ff는 회색 카드 위 글자로 4.36:1. 같은 파랑을 살짝 진하게(4.9:1)
  danger: "#c62828", // 오류·삭제 문구에만. DESIGN.md엔 없지만 데이터 삭제 경고는 구분돼야 함
};
// 다크 모드: 같은 모노크롬을 뒤집음. ink 위 글자는 canvas
const dark: typeof light = {
  ink: "#f2f2f2",
  inkSoft: "#dcdcdc",
  muted: "#a3a3a3",
  faint: "#6b6b6b",
  canvas: "#0f0f0f",
  soft: "#1c1c1c",
  field: "#232323",
  hairline: "#2e2e2e",
  accent: "#6aa6ff",
  danger: "#ff6b6b",
};
// ponytail: 실행할 때 한 번 정함. 앱을 켠 채 시스템 테마를 바꾸면 재실행해야 반영
export const isDark = Appearance.getColorScheme() === "dark";
export const color = isDark ? dark : light;
export const radius = { sm: 16, md: 24, full: 9999 };

type Kind = "primary" | "outline" | "soft" | "danger";
const BUTTON: Record<Kind, { bg: string; fg: string; border?: string }> = {
  primary: { bg: color.ink, fg: color.canvas },
  outline: { bg: color.canvas, fg: color.ink, border: color.hairline },
  soft: { bg: color.soft, fg: color.ink },
  danger: { bg: color.canvas, fg: color.danger, border: color.hairline },
};

export function Button(props: { title: string; onPress: () => void; kind?: Kind; disabled?: boolean }) {
  const k = BUTTON[props.kind ?? "primary"];
  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!props.disabled }}
      style={({ pressed }) => [
        s.button,
        { backgroundColor: k.bg, borderColor: k.border ?? k.bg },
        (pressed || props.disabled) && { opacity: 0.6 },
      ]}
    >
      <Text style={[s.buttonText, { color: k.fg }]}>{props.title}</Text>
    </Pressable>
  );
}

type Tone = "ink" | "soft" | "muted" | "outline" | "accent";
const BADGE: Record<Tone, [bg: string, fg: string]> = {
  ink: [color.ink, color.canvas],
  soft: [color.soft, color.inkSoft],
  muted: [color.soft, color.muted],
  outline: [color.canvas, color.inkSoft],
  accent: [color.accent, color.canvas],
};

export const Badge = ({ label, tone = "soft" }: { label: string; tone?: Tone }) => (
  <View style={[s.badge, { backgroundColor: BADGE[tone][0] }, tone === "outline" && s.badgeOutline]}>
    <Text style={[s.label, { color: BADGE[tone][1] }]}>{label}</Text>
  </View>
);

export const Chip = ({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) => (
  <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} style={[s.chip, on && { backgroundColor: color.ink }]}>
    <Text style={[s.chipText, on && { color: color.canvas }]}>{label}</Text>
  </Pressable>
);

// 회색 트랙 위 알약. dark면 선택 항목이 잉크(하단 탭), 아니면 흰 알약(화면 안 전환)
export function Segmented<T extends string>(props: { items: [T, string][]; value: T; onChange: (v: T) => void; dark?: boolean }) {
  return (
    <View style={s.segment} accessibilityRole="tablist">
      {props.items.map(([k, label]) => {
        const on = props.value === k;
        return (
          <Pressable
            key={k}
            onPress={() => props.onChange(k)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[s.seg, on && (props.dark ? { backgroundColor: color.ink } : s.segOn)]}
          >
            <Text style={[s.segText, on && { color: props.dark ? color.canvas : color.ink, fontWeight: "600" }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const Card = ({ children }: { children: ReactNode }) => <View style={s.card}>{children}</View>;

export const Empty = ({ children }: { children: ReactNode }) => (
  <View style={s.empty}>
    <Text style={[s.body, { color: color.muted, textAlign: "center" }]}>{children}</Text>
  </View>
);

// 목록 모양 회색 틀. 상위 카드 1개 + 줄 몇 개
export const Skeleton = () => (
  <View accessibilityLabel="Loading" accessibilityRole="progressbar">
    <View style={[s.card, { height: 260 }]} />
    {[0, 1, 2, 3].map((i) => (
      <View key={i} style={{ paddingVertical: 14, gap: 8 }}>
        <View style={[s.bone, { width: "60%", height: 18 }]} />
        <View style={[s.bone, { width: "85%" }]} />
      </View>
    ))}
  </View>
);

export const Loading = () => (
  <View style={s.center}>
    <ActivityIndicator size="large" color={color.ink} />
  </View>
);

export const s = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  card: { backgroundColor: color.soft, borderRadius: radius.md, padding: 20, marginBottom: 12 },
  empty: { backgroundColor: color.soft, borderRadius: radius.md, paddingVertical: 48, paddingHorizontal: 24 },
  // 웹 스케일(56/44/32px)을 휴대폰에 맞게 줄임. 굵은 제목 + 보통 본문의 무게 대비는 유지
  h1: { fontSize: 28, fontWeight: "700", lineHeight: 34, color: color.ink, marginBottom: 8 },
  h2: { fontSize: 18, fontWeight: "700", lineHeight: 24, color: color.ink },
  lead: { fontSize: 17, fontWeight: "300", lineHeight: 25, color: color.ink },
  body: { fontSize: 16, lineHeight: 22, color: color.ink },
  sub: { fontSize: 14, lineHeight: 20, color: color.muted },
  label: { fontSize: 12, fontWeight: "600", lineHeight: 16 },
  section: { fontSize: 18, fontWeight: "700", color: color.ink, marginTop: 32, marginBottom: 12 },
  error: { fontSize: 14, color: color.danger, marginTop: 4 },
  button: { minHeight: 52, paddingVertical: 12, borderRadius: radius.full, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, marginTop: 8 },
  buttonText: { fontSize: 16, fontWeight: "600" },
  badge: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  badgeOutline: { borderWidth: 1, borderColor: color.hairline, paddingVertical: 3 },
  chip: { paddingHorizontal: 16, minHeight: 36, paddingVertical: 6, justifyContent: "center", borderRadius: radius.full, backgroundColor: color.soft },
  chipText: { fontSize: 14, color: color.ink },
  segment: { flexDirection: "row", backgroundColor: color.soft, borderRadius: radius.full, padding: 4 },
  seg: { flex: 1, minHeight: 40, paddingVertical: 8, alignItems: "center", justifyContent: "center", borderRadius: radius.full },
  // DESIGN.md가 허용하는 유일한 그림자: 트랙 위에 뜬 선택 알약
  segOn: { backgroundColor: color.canvas, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segText: { fontSize: 14, color: color.muted },
  bone: { height: 14, borderRadius: radius.sm, backgroundColor: color.soft },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.hairline },
});
