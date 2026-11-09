-- 로그인 없음: 앱이 기기에서 만든 비밀 토큰의 SHA-256이 곧 기기 id
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,            -- sha256(기기 토큰) hex
  geo TEXT NOT NULL,              -- 알림 받을 나라 (KR, US …)
  locale TEXT NOT NULL,           -- 알림 문구 언어 (shared/trends.ts LOCALES)
  tz TEXT NOT NULL,               -- 기기 시간대 (Asia/Seoul …). 현지 시각에 맞춰 보냄
  push_token TEXT,                -- ExponentPushToken[...], 권한 거부 시 NULL
  notify INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS devices_push ON devices (notify, geo) WHERE push_token IS NOT NULL;

-- 나라별 마지막으로 받은 인기 검색어. 구글이 막을 때 대신 보여줌
CREATE TABLE IF NOT EXISTS trends_cache (
  geo TEXT PRIMARY KEY,
  data TEXT NOT NULL,             -- Trend[] JSON
  fetched_at INTEGER NOT NULL     -- ms
);

-- 인기 검색어 기록 (매시간 GEOS 수집). 같은 검색어가 12시간 안에 다시 보이면 같은 행을 이어 갱신.
CREATE TABLE IF NOT EXISTS trend_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  geo TEXT NOT NULL,
  title TEXT NOT NULL,
  first_seen INTEGER NOT NULL,      -- 처음 수집된 시각 (unix ms)
  last_seen INTEGER NOT NULL,       -- 마지막으로 보인 시각 (unix ms)
  peak_traffic INTEGER NOT NULL,    -- 최고 검색량 ("20000+" → 20000)
  best_rank INTEGER NOT NULL,       -- 최고 순위 (검색량 순 1부터)
  hours INTEGER NOT NULL DEFAULT 1, -- 몇 번의 수집에서 보였는지 ≈ 떠 있던 시간
  news TEXT                         -- 처음 보였을 때의 대표 뉴스 JSON {title,url,source}
);
CREATE INDEX IF NOT EXISTS trend_history_geo_seen ON trend_history (geo, last_seen);
CREATE INDEX IF NOT EXISTS trend_history_title ON trend_history (geo, title, last_seen);
