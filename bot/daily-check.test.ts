/** Утренняя самопроверка прода: «проблем нет» — тишина; «проблемы есть» — одно короткое сообщение владельцу */
import { describe, expect, it } from "vitest";
import { ON_SALE_IDS } from "@/templates/catalog";
import { badTextIn, dailyCheck, ERRORS_ALERT } from "./daily-check";
import type { HealthIo } from "./health";
import { ADMIN, Sim } from "./testing/sim";

const GOOD = "<html><body><h1>Азиз ва Мадина</h1><p>7 990 ₸</p><script>self.__next_f.push(undefined)</script></body></html>";

function io(over: Record<string, { status: number; text?: string }> = {}): HealthIo & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    recipients: () => [ADMIN],
    fetch: (async (input: string | URL) => {
      const url = String(input);
      calls.push(url);
      const path = new URL(url).pathname;
      const hit = Object.entries(over).find(([k]) => path === k || url.endsWith(k));
      const r = hit?.[1] ?? { status: path.startsWith("/audio/") ? 206 : 200, text: GOOD };
      return new Response(r.text ?? GOOD, { status: r.status });
    }) as typeof fetch,
  };
}

const at = (iso: string) => new Sim({ now: iso });

describe("утренняя самопроверка", () => {
  it("всё в порядке — проверено всё (54 демо, 54 обложки, музыка, каталог), сообщения нет", async () => {
    const s = at("2026-11-19T04:05:00Z"); // 09:05 Алматы
    const h = io();
    const r = await dailyCheck(s.deps, h);
    expect(r).toMatchObject({ ran: true, sent: 0, problems: [] });
    expect(h.calls.filter((u) => u.includes("/demo/"))).toHaveLength(ON_SALE_IDS.length);
    expect(h.calls.filter((u) => u.includes("/covers/thumb/") && u.includes("?v="))).toHaveLength(ON_SALE_IDS.length);
    expect(h.calls.some((u) => u.endsWith("/catalog"))).toBe(true);
    expect(h.calls.some((u) => u.endsWith("/catalog/invite"))).toBe(true);
    expect(h.calls.filter((u) => u.includes("/audio/")).length).toBeGreaterThanOrEqual(4);
    expect(s.tg.to(ADMIN)).toHaveLength(0);
  });

  it("до 09:00 не проверяет; второй запуск в тот же день — тоже нет", async () => {
    const s = at("2026-11-19T03:55:00Z"); // 08:55
    expect((await dailyCheck(s.deps, io())).ran).toBe(false);
    s.advance(10);
    expect((await dailyCheck(s.deps, io())).ran).toBe(true);
    s.advance(10);
    expect((await dailyCheck(s.deps, io({ "/catalog": { status: 500 } }))).ran).toBe(false);
    s.advance(24 * 60);
    expect((await dailyCheck(s.deps, io())).ran).toBe(true);
  });

  it("проблемы есть — одно сообщение по-русски со всеми находками", async () => {
    const s = at("2026-11-19T04:05:00Z");
    const [a, b, c] = ON_SALE_IDS;
    for (let i = 0; i < ERRORS_ALERT + 1; i++)
      await s.repo.logBotError({ step: i ? "audio" : "keepsake", updateKind: "x", errorName: "E", errorCode: null, message: "m", stack: null, outcome: "ack" });
    const o = await s.repo.createOrder({
      userId: 5,
      occasion: "nikoh",
      format: "animated",
      templateId: a,
      data: { events: [] } as never,
      music: { kind: "none" },
      amount: 7990,
      slugBase: "aziz-madina",
    } as never);
    await s.repo.saveRender(o.id, "video", { status: "queued", attempts: 1 });
    s.advance(30);
    const h = io({
      [`/demo/${a}`]: { status: 500 },
      [`/demo/${b}`]: { status: 200, text: "<p>Нархи: 8 000 ₸</p>" },
      [`/demo/${c}`]: { status: 200, text: '<img src="https://x.supabase.co/storage/v1/object/public/photos/1.webp">' },
      "/catalog/invite": { status: 404 },
      "/audio/originals/inviteizi-sunnat-oilaviy-shodlik.mp3": { status: 404 },
    });
    const r = await dailyCheck(s.deps, h);
    expect(r.sent).toBe(1);
    const msg = s.tg.to(ADMIN)[0].text;
    expect(msg).toMatch(/^⚠️ Утренняя проверка/);
    expect(msg).toContain(`${a} 500`);
    expect(msg).toContain(`${b}: старая цена`);
    expect(msg).toContain(`${c}: адрес Supabase Storage`);
    expect(msg).toContain("/catalog/invite: 404");
    expect(msg).toContain("inviteizi-sunnat-oilaviy-shodlik.mp3 404");
    expect(msg).toContain("audio — 3");
    expect(msg).toContain(`Видео зависли (> 20 мин): 1 — №${o.number}`);
  });

  it("сеть не отвечает — не падает, пишет «нет ответа»", async () => {
    const s = at("2026-11-19T04:05:00Z");
    const h: HealthIo = { recipients: () => [ADMIN], fetch: (async () => { throw new Error("ECONNRESET"); }) as typeof fetch };
    const r = await dailyCheck(s.deps, h);
    expect(r.sent).toBe(1);
    expect(s.tg.to(ADMIN)[0].text).toContain("нет ответа");
  });
});

describe("что считается мусором в странице", () => {
  it("undefined/NaN в тексте страницы — да; в скриптах Next — нет; старые цены — да; новые — нет", () => {
    expect(badTextIn(GOOD)).toEqual([]);
    expect(badTextIn("<p>Сана: undefined</p>")).toEqual(["undefined"]);
    expect(badTextIn("<p>NaN кун</p>")).toEqual(["NaN"]);
    expect(badTextIn("<p>5 000 ₸</p><p>6 000₸</p>")).toEqual(["старая цена"]);
    expect(badTextIn("<p>2 990 ₸ · 4 990 ₸ · 7 990 ₸ · 18 000 ₸</p>")).toEqual([]);
  });
});
