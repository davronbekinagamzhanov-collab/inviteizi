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
  await s.callback(id, `pay:${o.number}`, 1);
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
