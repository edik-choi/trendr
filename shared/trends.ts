// 서버와 앱이 같이 씀. 구글 트렌드 "지금 뜨는 검색어" RSS 파싱과 지원 나라·언어 목록.

export type News = { title: string; url: string; source: string };
export type Trend = { title: string; traffic: string; date: number; news: News[] };

// 나라 선택 목록. 방문자 나라(서버가 알려줌)는 이 목록에 없어도 맨 앞에 붙음
export const GEOS = ["US", "KR", "JP", "GB", "DE", "FR", "ES", "BR", "IN", "CA"] as const;
export const LOCALES = ["en", "ko", "ja", "de", "fr", "es", "pt"] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_GEO: Record<Locale, string> = { en: "US", ko: "KR", ja: "JP", de: "DE", fr: "FR", es: "ES", pt: "BR" };

export const isGeo = (v: unknown): v is string => typeof v === "string" && /^[A-Z]{2}$/.test(v);
export const isLocale = (v: unknown): v is Locale => (LOCALES as readonly unknown[]).includes(v);

const tag = (xml: string, name: string) =>
  (xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1] ?? "")
    .replace(/^<!\[CDATA\[|\]\]>$/g, "")
    .replace(/&(amp|lt|gt|quot|#39|apos);/g, (_, e: string) => ({ amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'" })[e]!)
    .trim();

export function parseTrends(xml: string): Trend[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, item]) => ({
    title: tag(item, "title"),
    traffic: tag(item, "ht:approx_traffic"),
    date: Date.parse(tag(item, "pubDate")) || 0,
    news: [...item.matchAll(/<ht:news_item>([\s\S]*?)<\/ht:news_item>/g)].map(([, n]) => ({
      title: tag(n, "ht:news_item_title"),
      url: tag(n, "ht:news_item_url"),
      source: tag(n, "ht:news_item_source"),
    })),
  }));
}

// 검색량("10000+") 많은 순, 같으면 최신 순
export const volume = (t: Trend) => parseInt(t.traffic.replace(/\D/g, "")) || 0;
export const rankTrends = (list: Trend[]) => [...list].sort((a, b) => volume(b) - volume(a) || b.date - a.date);
