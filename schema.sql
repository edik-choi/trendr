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
