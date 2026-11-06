import { describe, expect, it } from "vitest";
import { signInitData, verifyInitData } from "./tg-init-data";

const TOKEN = "123456:TEST-token";
const now = new Date("2026-11-05T10:00:00Z");
const authDate = String(Math.floor(now.getTime() / 1000) - 60);
const user = JSON.stringify({ id: 42, first_name: "Апа", username: "apa", language_code: "uz" });
const good = () => signInitData({ auth_date: authDate, query_id: "AAA", user }, TOKEN);

describe("initData Telegram", () => {
  it("верная подпись — пользователь", () => {
    expect(verifyInitData(good(), TOKEN, now)).toEqual({ id: 42, firstName: "Апа", username: "apa", languageCode: "uz" });
  });

  it("подделка: чужой id, чужой токен, нет hash, мусор — отказ", () => {
    const forged = good().replace(encodeURIComponent('"id":42'), encodeURIComponent('"id":43'));
    expect(verifyInitData(forged, TOKEN, now)).toBeNull();
    expect(verifyInitData(signInitData({ auth_date: authDate, user }, "999:other"), TOKEN, now)).toBeNull();
    expect(verifyInitData(`auth_date=${authDate}&user=${encodeURIComponent(user)}`, TOKEN, now)).toBeNull();
    for (const junk of ["", "hash=zz", "%%%", null, 42, "a".repeat(5000)]) expect(verifyInitData(junk, TOKEN, now)).toBeNull();
  });

  it("старше суток и «из будущего» — отказ", () => {
    const old = signInitData({ auth_date: String(Math.floor(now.getTime() / 1000) - 25 * 3600), user }, TOKEN);
    expect(verifyInitData(old, TOKEN, now)).toBeNull();
    const future = signInitData({ auth_date: String(Math.floor(now.getTime() / 1000) + 3600), user }, TOKEN);
    expect(verifyInitData(future, TOKEN, now)).toBeNull();
  });

  it("без пользователя или с кривым id — отказ", () => {
    expect(verifyInitData(signInitData({ auth_date: authDate }, TOKEN), TOKEN, now)).toBeNull();
    expect(verifyInitData(signInitData({ auth_date: authDate, user: '{"id":"42"}' }, TOKEN), TOKEN, now)).toBeNull();
  });
});
