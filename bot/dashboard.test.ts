import { describe, it, expect } from "vitest";
import { Sim, ADMIN, ADMIN2 } from "./testing/sim";
import { ru } from "@/texts/bot-ru";
import { MemoryRepo } from "./repo-memory";
import { nikohWithReceipt } from "./testing/paths";
const prepare = async (s: Sim, id: number) => { await s.start(id); await s.click(id, ru.langRu); };
describe("dashboard security and favorites", () => {
  it("ordinary users cannot open commands or forged report callbacks", async () => {
    const s = new Sim(); await prepare(s,1);
    await s.command(1,"dashboard"); expect(s.lastText(1)).toBe(ru.dashboard.denied);
    await s.callback(1,"dash:customers:all",1); expect(s.lastText(1)).toBe(ru.dashboard.denied);
    await expect(s.repo.analytics(1,"all",s.clock,true)).rejects.toThrow("access denied");
  });
  it("limited admin sees no customer analytics; owner report is private-chat only", async () => {
    const s = new Sim(); await prepare(s,ADMIN2); await prepare(s,ADMIN);
    await s.command(ADMIN2,"customers"); expect(s.lastText(ADMIN2)).toBe(ru.dashboard.denied);
    await expect(s.repo.analytics(ADMIN2,"all",s.clock,true)).rejects.toThrow("access denied");
    await s.callback(ADMIN,"dash:customers:all",1,-100123); expect(s.lastText(-100123)).toBe(ru.dashboard.denied);
    expect(await s.repo.canAnalyze(ADMIN)).toBe(true);
    expect((await s.repo.analytics(ADMIN,"all",s.clock,true)).customers).toEqual([]);
  });
  it("admin requires explicit analytics permission; unset owner fails closed", async () => {
    const r = new MemoryRepo({ adminIds: [1] });
    expect(await r.canAnalyze(1)).toBe(false); expect(await r.isOwner(1)).toBe(false);
  });
  it.each(["designs","music","customers","revenue","conversion"])("%s section sends a real PNG even without orders", async view => {
    const s = new Sim(); await prepare(s,ADMIN);
    await s.callback(ADMIN,`dash:${view}:week`,1);
    expect(s.last(ADMIN).type).toBe("photo");
    expect(s.tg.to(ADMIN).some(m => m.text === ru.error)).toBe(false);
  });
  it("favorites persist across /start, repeated add creates one row and one analytic event", async () => {
    const s = new Sim(); await prepare(s,1);
    await s.callback(1,"fav:add:oq-ot",1); await s.callback(1,"fav:add:oq-ot",1);
    await s.start(1); await s.command(1,"favorites");
    expect(await s.repo.listFavorites(1)).toEqual(["oq-ot"]);
    expect(await s.repo.listFavorites(2)).toEqual([]);
    const a = await s.repo.analytics(ADMIN,"all",s.clock);
    expect(a.designs[0].favorites).toBe(1); expect(a.revenue).toBe(0); expect(a.orders).toBe(0);
    await s.callback(1,"fav:choose:oq-ot",1); expect((await s.user(1))?.step).toBe("catalog");
    await s.callback(1,"fav:remove:oq-ot",1); await s.callback(1,"fav:remove:oq-ot",1);
    expect(await s.repo.listFavorites(1)).toEqual([]);
  });
  it("selection events deduplicate repeat callbacks", async () => {
    const s = new Sim(); await prepare(s,1);
    await Promise.all([s.repo.recordEvent(1,"design_selected","oq-ot","q1"),s.repo.recordEvent(1,"design_selected","oq-ot","q1")]);
    expect((await s.repo.analytics(ADMIN,"all",s.clock)).designs[0].selected).toBe(1);
  });
  it("owner approves once: dashboard updates; rejection and old callbacks do not add revenue", async () => {
    const s = new Sim(); await prepare(s,ADMIN);
    const o = await nikohWithReceipt(s,1);
    expect((await s.repo.analytics(ADMIN,"all",s.clock)).revenue).toBe(0);
    await s.callback(ADMIN,`ok:${o.number}`,1);
    await s.callback(ADMIN,`ok:${o.number}`,1);
    expect((await s.repo.analytics(ADMIN,"all",s.clock)).revenue).toBe(10000);
    const other = await nikohWithReceipt(s,2);
    await s.callback(ADMIN,`nr:${other.number}:money`,1);
    const a = await s.repo.analytics(ADMIN,"all",s.clock);
    expect(a.revenue).toBe(10000); expect(a.paid).toBe(1); expect(a.rejected).toBe(1);
    expect((await s.repo.getOrder(o.id))?.slug).toBe(o.slug);
    const photos = s.tg.to(ADMIN).filter(m => m.type === "photo").length;
    await s.command(ADMIN,"dashboard");
    expect(s.tg.to(ADMIN).some(m => m.text.includes(ru.dashboard.labels.revenue))).toBe(true);
    expect(s.tg.to(ADMIN).filter(m => m.type === "photo").length).toBe(photos + 2);
    await s.command(ADMIN,"orders"); expect(s.lastText(ADMIN)).toContain(ru.admin.ordersRecent);
    await s.command(ADMIN,"stats"); expect(s.lastText(ADMIN)).toContain("10");
  });
});
