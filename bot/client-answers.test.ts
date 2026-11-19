/** Этап 3: клиент видит «📝 Жавоблар · N киши · M оила» в боте и в Mini App; чужой — не видит */
import { beforeEach, describe, expect, it } from "vitest";
import { resetRateLimits } from "@/lib/rate-limit";
import { uz } from "@/texts/bot-uz";
import type { AppUser } from "@/lib/tg-init-data";
import { appAction } from "./app/dispatch";
import type { AppOrder } from "./app/service";
import { nikohOrder, paidWithRsvp } from "./testing/paths";
import { Sim } from "./testing/sim";

const user = (id: number): AppUser => ({ id, firstName: null, username: null, languageCode: null });

describe("«📝 Жавоблар» у клиента", () => {
  beforeEach(() => resetRateLimits());
  it("бот: на кнопке — сколько придёт; Mini App: итог и последние ответы; чужому — нет", async () => {
    const s = new Sim();
    const o = await paidWithRsvp(s, 1);
    const base = { orderId: o.id, ipHash: "h" };
    await s.repo.saveRsvp({ ...base, visitorKey: "a", name: "Каримовлар", guests: 4, attending: true });
    await s.repo.saveRsvp({ ...base, visitorKey: "b", name: "Олим ака", guests: 2, attending: true });
    await s.repo.saveRsvp({ ...base, visitorKey: "c", name: "Нодира", guests: 1, attending: false });
    await s.callback(1, "m:my", 1);
    const labels = s.tg.to(1).flatMap((m) => ((m.markup as { inline?: { text: string }[][] })?.inline ?? []).flat().map((b) => b.text));
    expect(labels).toContain(uz.rsvp.answersN(6, 2));
    expect(uz.rsvp.answersN(6, 2)).toBe("📝 Жавоблар · 6 киши · 2 оила");
    const r = (await appAction(s.deps, user(1), { action: "orders" })).body as { orders: AppOrder[] };
    const mine = r.orders.find((x) => x.id === o.id)!;
    expect(mine.rsvp).toMatchObject({ people: 6, families: 2, declined: 1 });
    expect(mine.rsvp!.replies.map((x) => x.name).sort()).toEqual(["Каримовлар", "Нодира", "Олим ака"]);
    const other = (await appAction(s.deps, user(2), { action: "orders" })).body as { orders: AppOrder[] };
    expect(other.orders.some((x) => x.id === o.id)).toBe(false);
  }, 30_000);

  it("нет ответов — кнопка без чисел; неоплаченный — без «Жавоблар»", async () => {
    const s = new Sim();
    const o = await paidWithRsvp(s, 1);
    expect(uz.rsvp.answersN(0, 0)).toBe(uz.rsvp.answers);
    const r = (await appAction(s.deps, user(1), { action: "orders" })).body as { orders: AppOrder[] };
    expect(r.orders.find((x) => x.id === o.id)!.rsvp).toMatchObject({ people: 0, families: 0, replies: [] });
    const draft = await nikohOrder(s, 3);
    const d = (await appAction(s.deps, user(3), { action: "orders" })).body as { orders: AppOrder[] };
    expect(d.orders.find((x) => x.id === draft.id)!.rsvp ?? null).toBeNull();
  }, 30_000);
});
