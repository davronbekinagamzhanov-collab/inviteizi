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
  it.each(["designs","music","customers","revenue","conversion"])("%s section sends text without empty charts", async view => {
    const s = new Sim(); await prepare(s,ADMIN);
    await s.callback(ADMIN,`dash:${view}:week`,1);
    expect(s.last(ADMIN).type).toBe("text");
    expect(s.tg.to(ADMIN).filter(m => m.type === "photo")).toHaveLength(0);
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
    expect((await s.repo.analytics(ADMIN,"all",s.clock)).revenue).toBe(8000);
    const other = await nikohWithReceipt(s,2);
    await s.callback(ADMIN,`nr:${other.number}:money`,1);
    const a = await s.repo.analytics(ADMIN,"all",s.clock);
    expect(a.revenue).toBe(8000); expect(a.paid).toBe(1); expect(a.rejected).toBe(1);
    expect((await s.repo.getOrder(o.id))?.slug).toBe(o.slug);
    const photos = s.tg.to(ADMIN).filter(m => m.type === "photo").length;
    await s.command(ADMIN,"dashboard");
    expect(s.tg.to(ADMIN).some(m => m.text.includes(ru.dashboard.labels.revenue))).toBe(true);
    expect(s.tg.to(ADMIN).filter(m => m.type === "photo").length).toBe(photos + 2);
    await s.command(ADMIN,"orders"); expect(s.lastText(ADMIN)).toContain(ru.admin.ordersRecent);
    await s.command(ADMIN,"stats"); expect(s.lastText(ADMIN)).toContain("8 000 ₸");
  });
});

describe("owner dashboard readable reports", () => {
  it("general text includes zero categories/formats and separates activity from sales", async () => {
    const s = new Sim(); await prepare(s,ADMIN);
    await s.command(ADMIN,"dashboard");
    const text = s.tg.to(ADMIN).map(m=>m.text).join("\n");
    for (const name of ["Никоҳ","Наҳорги ош","Суннат","Юбилей","Simple","Scroll","Animated"]) expect(text).toContain(name);
    expect(text).toContain(ru.dashboard.activity);
    expect(text).toContain("0.0%");
    expect(s.tg.to(ADMIN).filter(m=>m.type === "photo")).toHaveLength(0);
  });
  it("date range carries across navigation, stays within Telegram limits, and rejects bad dates", async () => {
    const s = new Sim(); await prepare(s,ADMIN);
    await s.command(ADMIN,"dashboard","2026-10-01 2026-11-01");
    expect(s.lastText(ADMIN)).toContain("2026-10-01 — 2026-11-01");
    const {inlineButtons} = await import("./testing/fake-tg");
    const buttons = inlineButtons(s.last(ADMIN));
    expect(buttons.some(b=>"data" in b && b.data === "dash:orders:date=2026-10-01..2026-11-01")).toBe(true);
    expect(buttons.every(b=>Buffer.byteLength("data" in b ? b.data : "") <= 64)).toBe(true);
    await s.command(ADMIN,"dashboard","2026-02-30");
    expect(s.lastText(ADMIN)).toContain(ru.dashboard.invalidDates);
    await s.callback(ADMIN,"dash:dates:all",1);
    expect(s.lastText(ADMIN)).toBe(ru.dashboard.dateHelp);
  });
  it("order details show Almaty time, design number/name/format/cue, and no customer identity", async () => {
    const s = new Sim(); await prepare(s,ADMIN);
    const o = await nikohWithReceipt(s,1); await s.callback(ADMIN,`ok:${o.number}`,1);
    const before = s.tg.to(ADMIN).length;
    await s.callback(ADMIN,"dash:orders:today",1);
    const messages = s.tg.to(ADMIN).slice(before);
    const text = messages.map(m=>m.text).join("\n");
    expect(text).toContain(`#${o.number}`);
    expect(text).toContain("01.11.2026, 12:00");
    expect(text).toContain("Animated"); expect(text).toContain("№");
    expect(text).not.toContain("@user1"); expect(text).not.toContain(o.slug);
    expect(messages.every(m=>m.text.length <= 4096)).toBe(true);
  });
  it("allowed analytics admin can read anonymous orders but not customer reports", async () => {
    const s = new Sim(); await prepare(s,ADMIN2);
    await s.callback(ADMIN2,"dash:orders:all",1);
    expect(s.lastText(ADMIN2)).toContain(ru.dashboard.detailsNote);
    await s.callback(ADMIN2,"dash:customers:date=2026-10-01",1);
    expect(s.lastText(ADMIN2)).toBe(ru.dashboard.denied);
  });
  it.each(["orders","dates","general"])("forged %s custom-date callbacks remain private", async view => {
    const s = new Sim(); await prepare(s,1); await prepare(s,ADMIN);
    await s.callback(1,`dash:${view}:date=2026-10-01`,1);
    expect(s.lastText(1)).toBe(ru.dashboard.denied);
    await s.callback(ADMIN,`dash:${view}:date=2026-10-01`,1,-123);
    expect(s.lastText(-123)).toBe(ru.dashboard.denied);
  });
  it("supports Uzbek reports and date guidance", async () => {
    const s = new Sim(); await s.start(ADMIN);
    const {uz} = await import("@/texts/bot-uz");
    await s.click(ADMIN,uz.langUz);
    await s.command(ADMIN,"dashboard");
    expect(s.lastText(ADMIN)).toContain(uz.dashboard.financialNote);
    await s.callback(ADMIN,"dash:dates:all",1);
    expect(s.lastText(ADMIN)).toBe(uz.dashboard.dateHelp);
  });
});


it("design pagination exposes all 50 visual cues without oversized Telegram messages", async () => {
  const s = new Sim(); await prepare(s,ADMIN);
  const before=s.tg.to(ADMIN).length;
  for(let page=0;page<5;page++) await s.callback(ADMIN,`dash:designs:all:${page}`,1);
  const messages=s.tg.to(ADMIN).slice(before);
  const text=messages.map(m=>m.text).join("\n");
  const {activeDesigns}=await import("@/templates/registry");
  const {designVisuals}=await import("@/texts/design-visuals");
  for(const d of activeDesigns()) {
    expect(text).toContain(`№${d.number} —`);
    expect(text).toContain(designVisuals[d.id].ru);
    expect(designVisuals[d.id].uz).toBeTruthy();
  }
  expect(messages.every(m=>m.text.length<=4096)).toBe(true);
});


it("order details keep the saved historical format despite catalog reclassification", async () => {
  const s=new Sim();await prepare(s,ADMIN);
  const o=await nikohWithReceipt(s,1);
  await s.repo.updateOrder(o.id,{templateId:"shohona-baxmal",format:"simple",amount:6543});
  const before=s.tg.to(ADMIN).length;
  await s.callback(ADMIN,"dash:orders:all",1);
  const text=s.tg.to(ADMIN).slice(before).map(m=>m.text).join("\n");
  expect(text).toContain("— Simple —");expect(text).toContain("6 543 ₸");
  expect(text).not.toContain("— Scroll —");
});
