import assert from "node:assert/strict";
import { test } from "node:test";
import { digest, isTimeZone, localHour } from "./digest.ts";

const t = (title: string) => ({ title, traffic: "", date: 0, news: [] });

test("localHour", () => {
  const noonUtc = new Date("2026-11-09T03:00:00Z");
  assert.equal(localHour("Asia/Seoul", noonUtc), 12);
  assert.equal(localHour("America/New_York", noonUtc), 22);
  assert.equal(localHour("Not/AZone", noonUtc), null);
  assert.equal(isTimeZone("Europe/Berlin"), true);
  assert.equal(isTimeZone(""), false);
});

test("digest", () => {
  assert.deepEqual(digest([t("a"), t("b"), t("c"), t("d")], "ko"), { title: "지금 뜨는 검색어", body: "1. a  2. b  3. c" });
  assert.equal(digest([t("a")], "xx")?.title, "Trending now");
  assert.equal(digest([], "en"), null);
});
