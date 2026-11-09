import { isLocale, type Locale, type Trend } from "../shared/trends.ts";

// 기기 현지 시각으로 아침·점심·저녁 하루 3번
export const PUSH_HOURS = [8, 12, 19];

// 시간대가 잘못됐으면 null (그 기기는 건너뜀)
export function localHour(tz: string, now = new Date()): number | null {
  try {
    const h = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" })
      .formatToParts(now).find((p) => p.type === "hour")?.value;
    return h === undefined ? null : Number(h) % 24;
  } catch {
    return null;
  }
}

export const isTimeZone = (v: unknown): v is string => typeof v === "string" && v.length <= 64 && localHour(v) !== null;

const TITLE: Record<Locale, string> = {
  en: "Trending now",
  ko: "지금 뜨는 검색어",
  ja: "いま話題の検索ワード",
  de: "Gerade im Trend",
  fr: "Tendances du moment",
  es: "Tendencias ahora",
  pt: "Em alta agora",
};

// 상위 3개 키워드를 한 줄로. 목록이 비면 null (보내지 않음)
export function digest(trends: Trend[], locale: string): { title: string; body: string } | null {
  const top = trends.slice(0, 3).map((t) => t.title).filter(Boolean);
  if (!top.length) return null;
  return { title: TITLE[isLocale(locale) ? locale : "en"], body: top.map((t, i) => `${i + 1}. ${t}`).join("  ") };
}
