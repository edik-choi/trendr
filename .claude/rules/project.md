# Trendr

애드몹 수익형 글로벌 모바일 앱. 나라별 구글 "지금 뜨는 검색어"와 관련 뉴스를 보여주고, 하루 3번(현지 8·12·19시) 상위 3개를 요약 푸시. 푸시 → 앱 접속 → 광고 노출이 수익 구조. 구조는 청약시그널(edik-choi/subscription)과 같음.

## 구조
- `src/` Cloudflare Worker (Hono).
  - `GET /api/trends?geo=` 로그인 없이. 구글 트렌드 RSS(`trends.google.com/trending/rss?geo=`)를 엣지에 10분 캐시. `home`은 요청 기기의 나라(cf.country).
  - `GET /api/trend?geo=&q=` 검색어 상세: 지금 목록의 항목(뉴스 전체)·순위, 최근 3일 시간별 순위(trend_points), 지난 기록, 최근 3일 다른 나라 기록. 로그인 없이.
  - `GET|PUT|DELETE /api/me` Bearer 필요. 알림 설정(geo, locale, tz, notify, pushToken).
  - `/privacy` 스토어 등록용 개인정보처리방침(`src/privacy.ts`, 한·영).
  - Cron `0 * * * *`: ① `collect` — GEOS 10개 나라 목록을 `trend_history`에 기록(`src/history.ts`) ② `notify` — 기기 시간대 기준 지금이 `PUSH_HOURS`(`src/digest.ts`)인 기기에 나라별 상위 3개 푸시(Expo Push, ①에서 받은 목록 재사용). DeviceNotRegistered면 토큰 비움.
- `shared/trends.ts`: RSS 파싱, 순위, 나라·언어 목록. 서버와 앱이 같이 씀.
- `app/` Expo(SDK 58) 앱. 탭 2개: 인기 검색어(나라 칩, 당겨서 새로고침, 줄 → 전면 광고 후 상세 화면 `TrendDetail.tsx`(탭 위에 열림, 안드로이드 뒤로 가기), 뉴스 줄 → 전면 광고 후 기사) / 설정(알림, 알림 나라, 개인정보처리방침, 내 정보 삭제). 하단 배너. 첫 화면에 알림 권유 카드.
  - 7개 언어(en, ko, ja, de, fr, es, pt): `app/src/i18n.ts`. 기기 언어 중 지원하는 첫 언어, 없으면 영어.
  - 디자인 토큰·공용 컴포넌트는 `app/src/ui.tsx`(청약시그널과 같은 모노크롬).
  - 공유 카드 `app/src/share.tsx`: 화면 밖에 카드를 그려 1080×1350 PNG로 캡처(react-native-view-shot) → 시스템 공유창(expo-sharing). 상세 화면 "공유" = 검색어 카드, 홈 "공유" = TOP 5 카드. 항상 어두운 카드. 실패 시 텍스트 공유.
- D1 `trendr` (`schema.sql`): devices(id=sha256(기기 토큰), geo, locale, tz, push_token, notify), trend_history(geo, title, first_seen, last_seen, peak_traffic, best_rank, hours, news — 같은 검색어가 12시간 안에 다시 보이면 같은 행 갱신), trend_points(geo, title, ts, rank, traffic — 시간별, 30일 보관), trends_cache(나라별 마지막 목록).

## 명령
- 루트: `npm test`, `npm run typecheck`, `npm run dev`, `npm run deploy`, `npm run db:init`
  - cron 테스트: `wrangler dev --test-scheduled` 후 `/__scheduled` 호출
- `app/`: `npx tsc --noEmit`, `npx expo-doctor`, `npx expo start`(개발 빌드 필요, Expo Go 불가), 빌드는 청약시그널과 같은 EAS Workflows(`app/.eas/workflows/`)
- Expo 패키지는 `npx expo install`로만 추가.

## 앱 빌드·업데이트
청약시그널과 같음: `git push -f origin main:build-preview`(테스트 APK), `main:build-production`(스토어). 워크플로가 네이티브 fingerprint를 비교해 같은 빌드가 있으면 빌드 대신 해당 채널로 OTA 업데이트만 보냄. 네이티브가 바뀌면 `version` 올리고 푸시.

## 출시 전 할 일 (app/app.json)
- 앱 이름 `Trendr`(스토어 등록명은 "Trendr: Trending Searches Now" 식으로 부제 포함). 아이콘은 `python3 scripts/icons.py app/assets store`로 생성. 스토어 문구·그래픽은 `store/`
- 패키지명 `com.trendr.app` (스토어 출시 후 변경 불가)
- `extra.apiUrl`: 배포된 Worker 주소 (https://trendr.edik-choi.workers.dev)
- 애드몹: Android 앱(Trendr, `~8605128106`)·배너·전면 광고 단위 등록 완료. iOS는 아직 샘플 ID(출시할 때 애드몹에 iOS 앱 추가). production 채널이 아니면 테스트 광고
- `npx eas-cli@latest init`으로 `extra.eas.projectId`·`updates.url` 채우기. 없으면 푸시 토큰 발급 안 됨
- Android 푸시: Firebase 프로젝트 `trendr-99ede`에 com.trendr.app 등록, `app/google-services.json` 반영. FCM v1 서비스 계정 키 EAS 등록 완료

## 로드맵
목표: "지금 뜨는 것을 가장 빨리, 왜 뜨는지까지". 일반 사용자는 매일 여는 습관 앱(광고), 마케터·크리에이터는 Pro(유료).
1. 출시 전 기본기: 검색어 상세 화면(뉴스 전체, 순위 변화, 다른 나라에서도 떴는지) → 공유 카드(이미지) → 홈 화면 위젯 → 카테고리(Workers AI 분류)
2. 습관: 관심 키워드 알림(무료 2개, 그 이상 Pro), 저장, 오늘의 트렌드 정리(밤)
3. Pro: 무제한·즉시 키워드 알림, 광고 제거, 과거 기록 검색, AI 브리핑. 마케터용 웹 대시보드·슬랙 연동은 ai-kunst.com과 연결
- 출시 준비: 구글 플레이 비공개 테스트(12명 × 14일)를 기능 개발과 병행

## 결정사항
- 첫 버전: 목록 + 하루 3번 요약 푸시. 관심 키워드 알림은 2개까지 무료, 그 이상은 Pro.
- 유료 기능 후보(마케터용): 관심 키워드 즉시 알림, 슬랙·이메일·웹훅, 과거 기록 검색·리포트, AI 브리핑, 나라 간 확산 추적, CSV·API. 과거 기록은 2026-11-09부터 수집. 유료화 전 구글 트렌드 데이터 사용 약관 확인 필요.
- 무료 플랜 cron 한 번에 외부 요청 50개(나라 수 + 100명당 1개). 사용자가 수천 명을 넘으면 Queues로 분산.
- 개인정보: 이름·연락처 수집 안 함. 설정에서 삭제 시 서버 정보 즉시 삭제.
