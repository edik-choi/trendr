# Trendr

애드몹 수익형 글로벌 모바일 앱. 나라별 구글 "지금 뜨는 검색어"와 관련 뉴스를 보여주고, 하루 3번(현지 8·12·19시) 상위 3개를 요약 푸시. 푸시 → 앱 접속 → 광고 노출이 수익 구조. 구조는 청약시그널(edik-choi/subscription)과 같음.

## 구조
- `src/` Cloudflare Worker (Hono).
  - `GET /api/trends?geo=` 로그인 없이. 구글 트렌드 RSS(`trends.google.com/trending/rss?geo=`)를 엣지에 10분 캐시. `home`은 요청 기기의 나라(cf.country).
  - `GET|PUT|DELETE /api/me` Bearer 필요. 알림 설정(geo, locale, tz, notify, pushToken).
  - `/privacy` 스토어 등록용 개인정보처리방침(`src/privacy.ts`, 한·영).
  - Cron `0 * * * *`: 기기 시간대 기준 지금이 `PUSH_HOURS`(`src/digest.ts`)인 기기에 나라별 상위 3개 푸시(Expo Push). DeviceNotRegistered면 토큰 비움.
- `shared/trends.ts`: RSS 파싱, 순위, 나라·언어 목록. 서버와 앱이 같이 씀.
- `app/` Expo(SDK 58) 앱. 탭 2개: 인기 검색어(나라 칩, 당겨서 새로고침, 키워드 → 구글 검색, 뉴스 → 전면 광고 후 기사) / 설정(알림, 알림 나라, 개인정보처리방침, 내 정보 삭제). 하단 배너. 첫 화면에 알림 권유 카드.
  - 7개 언어(en, ko, ja, de, fr, es, pt): `app/src/i18n.ts`. 기기 언어 중 지원하는 첫 언어, 없으면 영어.
  - 디자인 토큰·공용 컴포넌트는 `app/src/ui.tsx`(청약시그널과 같은 모노크롬).
- D1 `trends` (`schema.sql`): devices(id=sha256(기기 토큰), geo, locale, tz, push_token, notify).

## 명령
- 루트: `npm test`, `npm run typecheck`, `npm run dev`, `npm run deploy`, `npm run db:init`
  - cron 테스트: `wrangler dev --test-scheduled` 후 `/__scheduled` 호출
- `app/`: `npx tsc --noEmit`, `npx expo-doctor`, `npx expo start`(개발 빌드 필요, Expo Go 불가), 빌드는 청약시그널과 같은 EAS Workflows(`app/.eas/workflows/`)
- Expo 패키지는 `npx expo install`로만 추가.

## 앱 빌드·업데이트
청약시그널과 같음: `git push -f origin main:build-preview`(테스트 APK), `main:build-production`(스토어). JS만 바뀌면 `npm run update:production`. 네이티브가 바뀌면 `version` 올리고 새 빌드.

## 출시 전 할 일 (app/app.json)
- 앱 이름 `Trendr`(스토어 등록명은 "Trendr: Trending Searches Now" 식으로 부제 포함). 아이콘·스플래시(`app/assets`는 청약시그널 것을 임시로 복사)
- 패키지명 `com.trendr.app` (스토어 출시 후 변경 불가)
- `extra.apiUrl`: 배포된 Worker 주소 (지금 https://trends.edik-choi.workers.dev 가정)
- 애드몹 앱 ID(`plugins`의 androidAppId/iosAppId, 지금 Google 샘플)와 `extra.admob` 광고 단위 ID. 비어 있으면 테스트 광고
- `npx eas-cli@latest init`으로 `extra.eas.projectId`·`updates.url` 채우기. 없으면 푸시 토큰 발급 안 됨
- Android 푸시: 새 Firebase 프로젝트의 `google-services.json`을 `app/`에 두고 `android.googleServicesFile` 추가, FCM v1 키를 EAS 자격증명에 등록

## 결정사항
- 첫 버전: 목록 + 하루 3번 요약 푸시. 관심 키워드 알림은 다음 단계(유료 기능 후보).
- 무료 플랜 cron 한 번에 외부 요청 50개(나라 수 + 100명당 1개). 사용자가 수천 명을 넘으면 Queues로 분산.
- 개인정보: 이름·연락처 수집 안 함. 설정에서 삭제 시 서버 정보 즉시 삭제.
