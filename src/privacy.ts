// 스토어 등록용 개인정보처리방침 (/privacy). 수집 항목이 바뀌면 같이 고칠 것.
const CONTACT_EMAIL = "edik.choi@gmail.com";
const UPDATED = "2026-11-09";

export const PRIVACY_HTML = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Privacy Policy</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:720px;margin:0 auto;padding:24px;color:#141414}h1{font-size:24px}h2{font-size:18px;margin-top:32px}</style>
</head><body>
<h1>개인정보처리방침</h1>
<p>최종 수정일: ${UPDATED}</p>
<p>이 앱은 회원가입이 없고 이름, 이메일, 전화번호를 받지 않아요.</p>
<h2>저장하는 정보</h2>
<ul>
<li>기기 식별값: 앱이 처음 실행될 때 만든 무작위 값의 해시. 사람을 알아볼 수 없어요.</li>
<li>알림 설정: 알림 받을 나라, 앱 언어, 기기 시간대(현지 시각에 맞춰 알림을 보내기 위해), 알림 켜짐 여부</li>
<li>푸시 토큰: 알림을 허용한 경우에만. 알림 발송에만 써요.</li>
</ul>
<h2>광고</h2>
<p>Google AdMob으로 광고를 보여줘요. Google은 광고 ID 등 기기 정보를 수집할 수 있으며, 자세한 내용은 <a href="https://policies.google.com/technologies/ads">Google 광고 정책</a>을 확인해 주세요. 기기 설정에서 광고 ID를 재설정하거나 맞춤 광고를 끌 수 있어요.</p>
<h2>삭제</h2>
<p>앱의 설정에서 "내 정보 삭제"를 누르면 서버에 저장된 정보가 바로 삭제돼요. 앱을 지워도 알림 발송이 실패하는 시점에 푸시 토큰이 지워져요.</p>
<h2>문의</h2>
<p>${CONTACT_EMAIL}</p>

<hr>
<h1 lang="en">Privacy Policy</h1>
<p>Last updated: ${UPDATED}</p>
<p>This app has no accounts and never asks for your name, email or phone number.</p>
<h2>What we store</h2>
<ul>
<li>Device ID: a hash of a random value created on first launch. It cannot identify you.</li>
<li>Alert settings: the country you follow, app language, device time zone (so alerts arrive at local times) and whether alerts are on.</li>
<li>Push token: only if you allow notifications, used only to send them.</li>
</ul>
<h2>Advertising</h2>
<p>We show ads with Google AdMob. Google may collect device information such as the advertising ID; see <a href="https://policies.google.com/technologies/ads">Google's ad policies</a>. You can reset the advertising ID or turn off personalized ads in your device settings.</p>
<h2>Deletion</h2>
<p>Tap "Delete my data" in the app settings to delete everything stored on our server immediately.</p>
<h2>Contact</h2>
<p>${CONTACT_EMAIL}</p>
</body></html>`;
