import { describe, expect, it } from "vitest";
import { uz } from "@/texts/bot-uz";
import { ru } from "@/texts/bot-ru";
import { t } from "@/texts/uz-cyrl";
import { handleRsvpRequest } from "@/lib/rsvp";
import { pageMode } from "@/lib/orders";
import { runCron } from "./cron";
import { ADMIN, Sim } from "./testing/sim";
import { buttonLabels } from "./testing/fake-tg";
import { nikohToMusic } from "./testing/paths";

const answer = (slug: string, key: string, attending: boolean, guests: number) =>
  new Request("https://x.test/api/rsvp", {
    method: "POST",
    headers: { origin: "https://x.test", "content-type": "application/json", "x-forwarded-for": "1.1.1.1" },
    body: JSON.stringify({ slug, visitorKey: `guest-key-${key}-0000000`, name: "Анвар", guests, attending }),
  });
const post = (s: Sim, r: Request) => handleRsvpRequest(r, { repo: s.repo, secret: "s", isOpen: (o) => pageMode(o, s.clock) === "full" });

async function toRsvpStep(s: Sim, id: number) {
  await nikohToMusic(s, id);
  await s.click(id, uz.music.none);
  // v2: бот сам включил ответы; к вопросу — через ✏️ в сводке
  await s.click(id, uz.rsvp.edit);
  expect(s.lastText(id)).toBe(uz.rsvp.ask);
}

async function paidOrder(s: Sim, id: number) {
  await toRsvpStep(s, id);
  await s.click(id, uz.rsvp.yes);
  await s.click(id, uz.review.confirm);
  const o = (await s.repo.listOrdersByStatus(["preview", "awaiting_payment"])).find((x) => x.userId === id)!;
  await s.callback(id,`payok:${o.number}`, 1);
  await s.photo(id, "receipt");
  await s.callback(ADMIN, `ok:${o.number}`, 1);
  return (await s.repo.getOrder(o.id))!;
}

const at = (s: Sim, iso: string) => { s.clock = new Date(iso); };
const digests = (s: Sim, id: number) => s.tg.to(id).filter((m) => m.text.startsWith("Бугун"));

describe("этап 3.1: понятные ответы гостей", () => {
  it("объяснение: кнопка на вопросе не меняет шаг; после «Ҳа» оно приходит само", async () => {
    const s = new Sim();
    await toRsvpStep(s, 1);
    await s.click(1, uz.rsvp.howButton);
    expect(s.lastText(1)).toBe(uz.rsvp.how);
    expect((await s.user(1))!.step).toBe("rsvp");
    const mark = s.mark();
    await s.click(1, uz.rsvp.yes);
    expect(s.tg.to(1).filter((m) => m.id >= mark).map((m) => m.text)).toContain(uz.rsvp.how);
    expect((await s.user(1))!.step).toBe("review");
    expect(ru.rsvp.how).toContain("Мои приглашения");
    expect(uz.rsvp.how).toContain("Менинг таклифномаларим");
  });

  it("«Йўқ» — без объяснения и без кнопки ответов", async () => {
    const s = new Sim();
    await toRsvpStep(s, 1);
    const mark = s.mark();
    await s.click(1, uz.rsvp.no);
    expect(s.tg.to(1).filter((m) => m.id >= mark).map((m) => m.text)).not.toContain(uz.rsvp.how);
  });

  it("намуна: сервер ответ не сохраняет, текст заметный", async () => {
    const s = new Sim();
    await toRsvpStep(s, 1);
    await s.click(1, uz.rsvp.yes);
    await s.click(1, uz.review.confirm);
    const o = (await s.repo.listOrdersByStatus(["preview", "awaiting_payment"]))[0];
    expect((await post(s, answer(o.slug, "a", true, 2))).status).toBe(404);
    expect(await s.repo.listRsvp(o.id)).toEqual([]);
    expect(t.rsvp.preview).toBe("Бу намуна — жавоблар тўловдан кейин сақланади");
    expect(t.rsvp.previewThanks).toBe("Раҳмат!");
  });

  it("после оплаты в сообщении есть кнопка ответов, и она открывает список", async () => {
    const s = new Sim();
    const o = await paidOrder(s, 1);
    const thanks = s.tg.to(1).filter((m) => m.text === uz.pay.paidPack(`https://inviteizi.vercel.app/${o.slug}`)).at(-1)!;
    expect(buttonLabels(thanks)).toEqual([uz.pay.shareButton, uz.rsvp.answers, uz.pay.newOrder]);
    await s.click(1, uz.rsvp.answers);
    expect(s.lastText(1)).toBe(uz.rsvp.empty);
    expect(o.data.rsvp).toBe(true);
  });

  it("сводка: в 20:00 по Алматы, один раз в день, только новые ответы", async () => {
    const s = new Sim();
    const o = await paidOrder(s, 1);
    await runCron(s.deps);
    expect(digests(s, 1)).toHaveLength(0); // ответов нет
    expect((await post(s, answer(o.slug, "a", true, 3))).status).toBe(204);
    expect((await post(s, answer(o.slug, "b", true, 2))).status).toBe(204);
    expect((await post(s, answer(o.slug, "c", false, 0))).status).toBe(204);

    at(s, "2026-11-01T14:50:00Z"); // 19:50
    await runCron(s.deps);
    expect(digests(s, 1)).toHaveLength(0);

    at(s, "2026-11-01T15:00:00Z"); // 20:00
    expect(await runCron(s.deps)).toMatchObject({ rsvpDigests: 1 });
    const [msg] = digests(s, 1);
    expect(msg.text).toBe(uz.rsvp.digest(3, 2, 5, 1));
    expect(msg.text).toBe("Бугун 3 киши жавоб берди: 2 келади (жами 5 киши), 1 келолмайди");
    expect(buttonLabels(msg)).toEqual([uz.rsvp.answers]);

    // Дублей нет ни в этот вечер, ни при новом ответе в тот же вечер
    s.advance(10);
    expect((await post(s, answer(o.slug, "d", true, 1))).status).toBe(204);
    expect(await runCron(s.deps)).toMatchObject({ rsvpDigests: 0 });
    expect(digests(s, 1)).toHaveLength(1);

    // Завтра — только новый ответ
    at(s, "2026-11-02T15:00:00Z");
    expect(await runCron(s.deps)).toMatchObject({ rsvpDigests: 1 });
    expect(digests(s, 1).at(-1)!.text).toBe(uz.rsvp.digest(1, 1, 1, 0));

    // Послезавтра новых нет — молчим
    at(s, "2026-11-03T15:00:00Z");
    expect(await runCron(s.deps)).toMatchObject({ rsvpDigests: 0 });
    expect(digests(s, 1)).toHaveLength(2);
  });

  it("повторный запуск не забирает уже взятую сводку", async () => {
    const s = new Sim();
    const day = new Date("2026-10-31T19:00:00Z");
    expect(await s.repo.claimRsvpDigest("x", day, s.clock)).toBe(true);
    expect(await s.repo.claimRsvpDigest("x", day, s.clock)).toBe(false);
  });
});

describe("тилак гостя (этап 3)", () => {
  const withWish = (slug: string, key: string, wish: unknown) =>
    new Request("https://x.test/api/rsvp", {
      method: "POST",
      headers: { origin: "https://x.test", "content-type": "application/json", "x-forwarded-for": "1.1.1.1" },
      body: JSON.stringify({ slug, visitorKey: `guest-key-${key}-0000000`, name: `Меҳмон ${key}`, guests: 2, attending: true, wish }),
    });

  it("пусто — без тилака; длинно (> 300) и ссылка — 422 с причиной, ответ не сохраняется; «!!!!!!» сжимается", async () => {
    const { cleanWish } = await import("@/lib/rsvp");
    expect(cleanWish(undefined)).toBeNull();
    expect(cleanWish("   ")).toBeNull();
    expect(cleanWish("Бахтли бўлинглар!!!!!!!")).toBe("Бахтли бўлинглар!!!");
    expect(cleanWish("а".repeat(301))).toBe("а".repeat(3));
    expect(cleanWish("Бахт ".repeat(61))).toBe("long");
    for (const link of ["https://spam.example", "www.casino.ru", "t.me/kanal", "Обуна бўлинг @kanal_uz", "sayt.uz га киринг"])
      expect(cleanWish(link), link).toBe("link");
    expect(cleanWish("Тўйингиз муборак, 5.5 соатда келамиз")).toBe("Тўйингиз муборак, 5.5 соатда келамиз");

    const s = new Sim();
    const o = await paidOrder(s, 1);
    expect((await post(s, withWish(o.slug, "a", ""))).status).toBe(204);
    const long = await post(s, withWish(o.slug, "b", "Бахт ".repeat(61)));
    expect(long.status).toBe(422);
    expect(await long.json()).toEqual({ error: "wishLong" });
    const link = await post(s, withWish(o.slug, "c", "Каналимиз: t.me/xyz"));
    expect(await link.json()).toEqual({ error: "wishLink" });
    const list = await s.repo.listRsvp(o.id);
    expect(list.map((r) => r.name)).toEqual(["Меҳмон a"]);
    expect(list[0].wish).toBeNull();
  });

  it("повтор: тот же тилак другого гостя — ответ сохраняется без тилака; свой ответ можно поправить", async () => {
    const s = new Sim();
    const o = await paidOrder(s, 1);
    await post(s, withWish(o.slug, "a", "Бахтли бўлинглар"));
    await post(s, withWish(o.slug, "b", "бахтли бўлинглар"));
    await post(s, withWish(o.slug, "a", "Бахтли бўлинглар, илоҳим!"));
    const byName = Object.fromEntries((await s.repo.listRsvp(o.id)).map((r) => [r.name, r.wish]));
    expect(byName).toEqual({ "Меҳмон a": "Бахтли бўлинглар, илоҳим!", "Меҳмон b": null });
  });

  it("хозяин видит тилаки в ежедневном отчёте (одним сообщением) и в «📝 Жавоблар»; на приглашении — нет", async () => {
    const s = new Sim();
    const o = await paidOrder(s, 1);
    await post(s, withWish(o.slug, "a", "Бахтли бўлинглар"));
    await post(s, withWish(o.slug, "b", "Тўйингиз муборак"));
    at(s, "2026-11-01T15:00:00Z");
    expect(await runCron(s.deps)).toMatchObject({ rsvpDigests: 1 });
    const [msg] = digests(s, 1);
    expect(msg.text).toContain(uz.rsvp.wishesHead);
    expect(msg.text).toContain(uz.rsvp.wishLine("Меҳмон a", "Бахтли бўлинглар"));
    expect(msg.text).toContain(uz.rsvp.wishLine("Меҳмон b", "Тўйингиз муборак"));
    await s.callback(1, `rsvp:${o.number}`, msg.id);
    expect(s.lastText(1)).toContain(uz.rsvp.wishLine("Меҳмон a", "Бахтли бўлинглар"));
    // в данных страницы приглашения тилаков нет
    const { invitationData } = await import("@/lib/orders");
    expect(JSON.stringify(invitationData((await s.repo.getOrder(o.id))!))).not.toContain("Бахтли");
  });

  it("много длинных тилаков — сообщение не длиннее лимита Telegram", async () => {
    const s = new Sim();
    const o = await paidOrder(s, 1);
    for (let i = 0; i < 40; i++) await post(s, withWish(o.slug, `k${i}`, `Тилак ${i} ` + "бахт ва саодат ".repeat(18)));
    at(s, "2026-11-01T15:00:00Z");
    await runCron(s.deps);
    expect(digests(s, 1)[0].text.length).toBeLessThanOrEqual(4096);
    await s.callback(1, `rsvp:${o.number}`, 1);
    expect(s.lastText(1)!.length).toBeLessThanOrEqual(4096);
  });
});
