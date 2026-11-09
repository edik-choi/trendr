import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import type { Locale, Trend } from "../../shared/trends.ts";

const API_URL: string = Constants.expoConfig?.extra?.apiUrl;
export const PRIVACY_URL = `${API_URL}/privacy`;

// 로그인 대신 기기에서 만든 무작위 토큰으로 알림 설정을 식별. 서버는 해시만 저장.
const TOKEN_KEY = "device_token";
let token: string | null = null;

async function deviceToken() {
  if (token) return token;
  token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) {
    token = [...Crypto.getRandomBytes(32)].map((b) => b.toString(16).padStart(2, "0")).join("");
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
  return token;
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: { authorization: `Bearer ${await deviceToken()}`, "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (e) {
    throw new Error(`No response (${API_URL}${path}) ${e instanceof Error ? e.message : ""}`);
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Server error (${res.status}) ${(await res.text().catch(() => "")).slice(0, 120)}`);
  return (await res.json()) as T;
}

// home: 서버가 본 기기의 나라. 첫 화면 기본 나라
export type TrendList = { home: string | null; geo: string; geos: string[]; trends: Trend[]; updated?: number };
export const getTrends = (geo?: string) => call<TrendList>("GET", `/api/trends${geo ? `?geo=${geo}` : ""}`);

export type Me = { geo: string; locale: Locale; tz: string; notify: boolean; hasPushToken: boolean };
export const getMe = () => call<Me>("GET", "/api/me");
export const saveMe = (me: { geo: string; locale: Locale; tz: string; notify: boolean }, pushToken: string | null) =>
  call("PUT", "/api/me", { ...me, pushToken });

// 서버 정보 삭제 후 기기 토큰도 지워서 새 기기로 시작
export async function deleteMe() {
  await call("DELETE", "/api/me");
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  token = null;
}
