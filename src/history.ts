import { volume, type Trend } from "../shared/trends.ts";

// 같은 나라·검색어가 이 시간 안에 다시 보이면 같은 "뜬 기간"으로 이어 붙임. 넘으면 새 기록.
export const EPISODE_GAP_MS = 12 * 60 * 60 * 1000;
export const POINTS_KEEP_MS = 30 * 24 * 60 * 60 * 1000;

// 매시간 한 나라의 목록(rankTrends 순서)을 trend_history에 반영하는 문장들. 한 batch로 실행.
// 이어지는 기록이 있으면 UPDATE, 없으면 INSERT (UPDATE를 먼저 실행하므로 INSERT의 NOT EXISTS가 걸러냄).
export function historyStatements(db: D1Database, geo: string, trends: Trend[], now = Date.now()) {
  const since = now - EPISODE_GAP_MS;
  return trends.flatMap((t, i) => {
    const rank = i + 1;
    const traffic = volume(t);
    const news = t.news[0] ? JSON.stringify(t.news[0]) : null;
    return [
      db.prepare(
        `UPDATE trend_history SET last_seen = ?1, peak_traffic = MAX(peak_traffic, ?2), best_rank = MIN(best_rank, ?3), hours = hours + 1
         WHERE geo = ?4 AND title = ?5 AND last_seen >= ?6`,
      ).bind(now, traffic, rank, geo, t.title, since),
      db.prepare(
        `INSERT INTO trend_history (geo, title, first_seen, last_seen, peak_traffic, best_rank, hours, news)
         SELECT ?1, ?2, ?3, ?3, ?4, ?5, 1, ?6
         WHERE NOT EXISTS (SELECT 1 FROM trend_history WHERE geo = ?1 AND title = ?2 AND last_seen >= ?7)`,
      ).bind(geo, t.title, now, traffic, rank, news, since),
      db.prepare("INSERT INTO trend_points (geo, title, ts, rank, traffic) VALUES (?, ?, ?, ?, ?)").bind(geo, t.title, now, rank, traffic),
    ];
  });
}

export const prunePoints = (db: D1Database, now = Date.now()) =>
  db.prepare("DELETE FROM trend_points WHERE ts < ?").bind(now - POINTS_KEEP_MS);

// 상세 화면용: 이 나라에서의 순위 변화(최근 3일), 지난 기록, 최근 3일 다른 나라에서 뜬 기록
export async function trendDetail(db: D1Database, geo: string, title: string, now = Date.now()) {
  const since = now - 3 * 24 * 60 * 60 * 1000;
  const [points, episodes, elsewhere] = await db.batch([
    db.prepare("SELECT ts, rank, traffic FROM trend_points WHERE geo = ? AND title = ? AND ts >= ? ORDER BY ts").bind(geo, title, since),
    db.prepare(
      "SELECT first_seen, last_seen, peak_traffic, best_rank, hours FROM trend_history WHERE geo = ? AND title = ? ORDER BY first_seen DESC LIMIT 5",
    ).bind(geo, title),
    db.prepare(
      `SELECT geo, MIN(first_seen) AS first_seen, MIN(best_rank) AS best_rank FROM trend_history
       WHERE title = ? COLLATE NOCASE AND geo != ? AND last_seen >= ? GROUP BY geo ORDER BY first_seen`,
    ).bind(title, geo, since),
  ]);
  return {
    points: points.results as { ts: number; rank: number; traffic: number }[],
    episodes: episodes.results as { first_seen: number; last_seen: number; peak_traffic: number; best_rank: number; hours: number }[],
    elsewhere: elsewhere.results as { geo: string; first_seen: number; best_rank: number }[],
  };
}
