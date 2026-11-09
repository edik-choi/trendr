import { Hono } from "hono";
import { GEOS, isGeo, isLocale, parseTrends, rankTrends, type Trend } from "../shared/trends.ts";
import { digest, isTimeZone, localHour, PUSH_HOURS } from "./digest.ts";
import { historyStatements } from "./history.ts";
import { PRIVACY_HTML } from "./privacy.ts";
import { isExpoPushToken, sendPush, type PushMessage } from "./push.ts";

type Env = {
  DB: D1Database;
  EXPO_ACCESS_TOKEN?: string; // EAS에서 "enhanced push security"를 켰을 때만 필요
};
type Vars = { deviceId: string };

const sha256 = async (s: string) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))]
    .map((b) => b.toString(16).padStart(2, "0")).join("");

// 구글 트렌드 "지금 뜨는 검색어" RSS. 구글이 Cloudflare 일부 IP를 429로 막아서
// 마지막 성공 결과를 D1에 두고 10분 안이면 그대로, 실패하면 오래된 것이라도 돌려줌
const FRESH_MS = 10 * 60_000;
async function fetchTrends(db: D1Database, geo: string): Promise<{ trends: Trend[]; updated: number }> {
  const row = await db.prepare("SELECT data, fetched_at FROM trends_cache WHERE geo = ?")
    .bind(geo).first<{ data: string; fetched_at: number }>();
  const cached = row && { trends: JSON.parse(row.data) as Trend[], updated: row.fetched_at };
  if (cached && Date.now() - cached.updated < FRESH_MS) return cached;
  try {
    // 구글이 느리면 앱 쪽 타임아웃(15초)보다 먼저 끊음
    const res = await fetch(`https://trends.google.com/trending/rss?geo=${geo}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`trends ${geo} ${res.status}`);
    const trends = rankTrends(parseTrends(await res.text()));
    if (!trends.length) throw new Error(`trends ${geo} empty`);
    const updated = Date.now();
    await db.prepare("INSERT OR REPLACE INTO trends_cache (geo, data, fetched_at) VALUES (?, ?, ?)")
      .bind(geo, JSON.stringify(trends), updated).run();
    return { trends, updated };
  } catch (e) {
    if (!cached) throw e;
    console.warn(`stale trends ${geo}`, e instanceof Error ? e.message : e);
    return cached;
  }
}

const app = new Hono<{ Bindings: Env; Variables: Vars }>();

app.get("/", (c) => c.text("Trends API"));
app.get("/privacy", (c) => c.html(PRIVACY_HTML));

// 목록은 로그인 없이. home: 요청한 기기의 나라(Cloudflare가 알려줌) — 앱 첫 화면 기본 나라
app.get("/api/trends", async (c) => {
  const country = (c.req.raw as { cf?: { country?: string } }).cf?.country;
  const home = isGeo(country) && country !== "XX" && country !== "T1" ? country : null;
  const q = c.req.query("geo")?.toUpperCase();
  const geo = isGeo(q) ? q : home ?? "US";
  try {
    return c.json({ home, geo, geos: GEOS, ...(await fetchTrends(c.env.DB, geo)) }, 200, { "cache-control": "public, max-age=300" });
  } catch (e) {
    const colo = (c.req.raw as { cf?: { colo?: string } }).cf?.colo;
    console.error(`api/trends failed geo=${geo} colo=${colo}`, e instanceof Error ? e.message : e);
    return c.json({ error: "unavailable", detail: e instanceof Error ? e.message.slice(0, 120) : null }, 502);
  }
});

// ---------- 알림 설정 ----------
// 인증: 앱이 처음 실행될 때 만든 무작위 토큰을 Bearer로 보냄. 서버는 해시만 저장.
app.use("/api/me", async (c, next) => {
  const token = c.req.header("authorization")?.match(/^Bearer ([A-Za-z0-9_-]{32,128})$/)?.[1];
  if (!token) return c.json({ error: "unauthorized" }, 401);
  c.set("deviceId", await sha256(token));
  await next();
});

app.get("/api/me", async (c) => {
  const row = await c.env.DB.prepare("SELECT geo, locale, tz, notify, push_token FROM devices WHERE id = ?")
    .bind(c.get("deviceId")).first<{ geo: string; locale: string; tz: string; notify: number; push_token: string | null }>();
  if (!row) return c.json({ error: "not_found" }, 404);
  return c.json({ geo: row.geo, locale: row.locale, tz: row.tz, notify: row.notify === 1, hasPushToken: !!row.push_token });
});

// 등록·수정. pushToken은 권한이 있을 때만 보냄(없으면 기존 값 유지)
app.put("/api/me", async (c) => {
  const b = await c.req.json<Record<string, unknown>>().catch(() => null);
  if (!b || !isGeo(b.geo) || !isLocale(b.locale) || !isTimeZone(b.tz)) return c.json({ error: "invalid" }, 400);
  const pushToken = isExpoPushToken(b.pushToken) ? b.pushToken : null;
  await c.env.DB.prepare(
    `INSERT INTO devices (id, geo, locale, tz, push_token, notify) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET geo = excluded.geo, locale = excluded.locale, tz = excluded.tz, notify = excluded.notify,
       push_token = COALESCE(excluded.push_token, devices.push_token), updated_at = datetime('now')`,
  ).bind(c.get("deviceId"), b.geo, b.locale, b.tz, pushToken, b.notify === false ? 0 : 1).run();
  return c.json({ ok: true });
});

app.delete("/api/me", async (c) => {
  await c.env.DB.prepare("DELETE FROM devices WHERE id = ?").bind(c.get("deviceId")).run();
  return c.json({ ok: true });
});

// ---------- 요약 푸시 ----------
// 매시 정각 실행. 기기 현지 시각이 PUSH_HOURS인 기기에만, 나라별 상위 3개 검색어를 보냄.
// 주의: 무료 플랜은 실행 한 번에 외부 요청 50개(기록 수집 10개 + 그 밖의 알림 나라 수 + 100명당 1개). 사용자가 수천 명을 넘으면 Queues로 나눠 보내기.
async function notify(env: Env, byGeo: Map<string, Trend[]>, now = new Date()) {
  const { results } = await env.DB.prepare(
    "SELECT id, geo, locale, tz, push_token FROM devices WHERE notify = 1 AND push_token IS NOT NULL",
  ).all<{ id: string; geo: string; locale: string; tz: string; push_token: string }>();
  const due = results.filter((d) => PUSH_HOURS.includes(localHour(d.tz, now) ?? -1));
  if (!due.length) return;

  for (const geo of new Set(due.map((d) => d.geo))) {
    if (byGeo.has(geo)) continue;
    try {
      byGeo.set(geo, (await fetchTrends(env.DB, geo)).trends);
    } catch (e) {
      console.error(e);
    }
  }

  const targets: { id: string; msg: PushMessage }[] = [];
  for (const d of due) {
    const m = digest(byGeo.get(d.geo) ?? [], d.locale);
    if (m) targets.push({ id: d.id, msg: { to: d.push_token, ...m, sound: "default", channelId: "trends", data: { geo: d.geo } } });
  }
  const tickets = await sendPush(targets.map((t) => t.msg), env.EXPO_ACCESS_TOKEN);

  // 앱을 지운 기기는 토큰을 비워 다음부터 보내지 않음
  const gone = targets.filter((_, i) => {
    const t = tickets[i];
    return t?.status === "error" && t.details?.error === "DeviceNotRegistered";
  });
  if (gone.length) {
    await env.DB.batch(gone.map((t) => env.DB.prepare("UPDATE devices SET push_token = NULL WHERE id = ?").bind(t.id)));
  }
  console.log(`push: ${targets.length} sent, ${gone.length} unregistered`);
}

// ---------- 과거 기록 ----------
// 매시간 GEOS의 목록을 trend_history에 쌓음(나중에 유료 기능: 기록 검색·리포트). 받아 온 목록은 푸시에도 재사용.
async function collect(env: Env, now = Date.now()) {
  const byGeo = new Map<string, Trend[]>();
  for (const geo of GEOS) {
    try {
      const { trends, updated } = await fetchTrends(env.DB, geo);
      byGeo.set(geo, trends);
      // 구글이 막아 오래된 캐시를 받은 경우엔 "지금도 떠 있다"고 기록하지 않음
      if (now - updated > FRESH_MS) {
        console.warn(`history ${geo} skipped (stale ${Math.round((now - updated) / 60000)}m)`);
        continue;
      }
      await env.DB.batch(historyStatements(env.DB, geo, trends, now));
    } catch (e) {
      console.error(`history ${geo}`, e instanceof Error ? e.message : e);
    }
  }
  return byGeo;
}

export default {
  fetch: app.fetch,
  scheduled: (_e: ScheduledController, env: Env, ctx: ExecutionContext) =>
    ctx.waitUntil(collect(env).then((byGeo) => notify(env, byGeo))),
};
