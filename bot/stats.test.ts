/**
 * v2, часть 8: «📊 Статистика» (владелец, менеджер, партнёр), «💰 Мой заработок», «📤 Выгрузка» (xlsx).
 * Каждый видит только своё; одно сообщение меняется кнопками; лимиты Telegram.
 */
import { inflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { uz } from "@/texts/bot-uz";
import { ru, staff } from "@/texts/bot-ru";
import { partnerSource } from "@/lib/owner-panel";
import { buildXlsx } from "@/lib/xlsx";
import { TG_LIMITS } from "./testing/fake-tg";
import { nikohWithReceipt } from "./testing/paths";
import { ADMIN, Sim } from "./testing/sim";

const S = staff.st;
const MANAGER = 700;
const PARTNER = 900;

const prepare = async (s: Sim, id: number, lang = uz.langUz) => {
  await s.start(id);
  if (s.lastText(id)?.startsWith("Тилни танланг")) await s.click(id, lang);
};

async function setup(s: Sim) {
  await s.repo.addManager({ telegramId: MANAGER, code: "mgr1", username: "aziz", firstName: "Азиз", invitedBy: ADMIN });
  await s.repo.createPartner({ code: "salon111", name: "Салон Малика", telegramId: PARTNER, username: null, rate: 1000, managedBy: MANAGER, schedule: "weekly", status: "active" });
  await s.repo.createPartner({ code: "dokon222", name: "Дўкон владельца", telegramId: null, username: null, rate: 500, schedule: "daily", status: "active" });
  await prepare(s, ADMIN, uz.langRu);
  await prepare(s, MANAGER, uz.langRu);
  await prepare(s, PARTNER);
}

async function paid(s: Sim, client: number, source: string | null) {
  if (source) await s.start(client, source);
  const o = await nikohWithReceipt(s, client);
  await s.callback(ADMIN, `ok:${o.number}`, 1);
  return o;
}

/** Распаковать xlsx (zip) → { имя файла: текст } */
function unzip(bytes: Uint8Array) {
  const b = Buffer.from(bytes);
  const out: Record<string, string> = {};
  for (let i = 0; i + 30 < b.length && b.readUInt32LE(i) === 0x04034b50; ) {
    const size = b.readUInt32LE(i + 18);
    const nameLen = b.readUInt16LE(i + 26);
    const name = b.subarray(i + 30, i + 30 + nameLen).toString("utf8");
    const data = b.subarray(i + 30 + nameLen, i + 30 + nameLen + size);
    out[name] = inflateRawSync(data).toString("utf8");
    i += 30 + nameLen + size;
  }
  return out;
}

describe("📊 Статистика владельца", () => {
  it("одно сообщение: 4 периода × 4 раздела, без «undefined», без новых сообщений", async () => {
    const s = new Sim();
    await setup(s);
    await paid(s, 1, partnerSource("salon111"));
    await paid(s, 2, null);
    await s.click(ADMIN, staff.btn.panel).catch(() => undefined);
    await s.start(ADMIN);
    await s.click(ADMIN, staff.btn.stats);
    const screen = s.last(ADMIN)!;
    const count = s.tg.to(ADMIN).length;
    for (const p of ["d", "w", "m", "y"]) {
      for (const sec of ["money", "pt", "ds", "fn"]) {
        await s.callback(ADMIN, `st:${p}:${sec}`, screen.id);
        expect(screen.text).toContain(S.sections[sec]);
        expect(screen.text).not.toMatch(/undefined|NaN/);
        expect(screen.text!.length).toBeLessThanOrEqual(TG_LIMITS.message);
      }
    }
    expect(s.tg.to(ADMIN).length).toBe(count);
    await s.callback(ADMIN, "st:m:money", screen.id);
    expect(screen.text).toContain(S.paid(2, "16 000 ₸"));
    expect(screen.text).toContain(S.partnersCost("1 000 ₸", "0 ₸"));
    expect(screen.text).toContain(S.managersCost("500 ₸"));
    await s.callback(ADMIN, "st:m:pt", screen.id);
    expect(screen.text).toContain("Салон Малика (@aziz) — 1 · 1 · 1 · к выплате 1 000 ₸");
    expect(screen.text).toContain(S.mgrLine("@aziz", 1, "500 ₸"));
  });

  it("менеджер, партнёр и клиент не открывают st:/ex:", async () => {
    const s = new Sim();
    await setup(s);
    await prepare(s, 1);
    for (const id of [MANAGER, PARTNER, 1]) {
      const before = s.tg.to(id).length;
      for (const d of ["st:m:money", "ex:m0:0:0", "ex:dl:m0:0:0", "ex:pp:m0:0:0:0"]) {
        await s.callback(id, d, s.last(id)!.id);
      }
      expect(s.tg.to(id).filter((m) => m.type === "document")).toHaveLength(0);
      expect(s.tg.to(id).length).toBe(before);
    }
  });
});

describe("статистика менеджера и партнёра", () => {
  it("менеджер видит только свою сеть и свой заработок", async () => {
    const s = new Sim();
    await setup(s);
    await paid(s, 1, partnerSource("salon111"));
    await paid(s, 2, partnerSource("dokon222"));
    await paid(s, 3, null);
    await s.start(MANAGER);
    await s.click(MANAGER, staff.btn.myStats);
    const screen = s.last(MANAGER)!;
    await s.callback(MANAGER, "sm:m:money", screen.id);
    expect(screen.text).toContain(S.paid(1, "8 000 ₸"));
    expect(screen.text).toContain(S.myMoney("500 ₸"));
    await s.callback(MANAGER, "sm:m:pt", screen.id);
    expect(screen.text).toContain("Салон Малика");
    expect(screen.text).not.toContain("Дўкон владельца");
    await s.callback(MANAGER, "sm:m:fn", screen.id);
    expect(screen.text).toContain(S.fnClients(1));
    expect(screen.text).not.toMatch(/user\d|Клиент\d/);

    await s.click(MANAGER, staff.back);
    await s.click(MANAGER, staff.btn.earnings);
    expect(s.lastText(MANAGER)).toContain(S.earnNow("Ноябрь", "1 оплата", "500 ₸"));
    expect(s.lastText(MANAGER)).toContain(staff.n.goal(1, 30, "15 000 ₸"));
  });

  it("партнёр: неделя / месяц / всё — сканы и оплаты, начислено / выплачено / к выплате; без клиентов", async () => {
    const s = new Sim();
    await setup(s);
    await paid(s, 1, partnerSource("salon111"));
    await s.start(2, partnerSource("salon111")); // скан без заказа
    await s.start(PARTNER);
    await s.click(PARTNER, uz.role.stats);
    const screen = s.last(PARTNER)!;
    expect(screen.text).toContain("QR сканерлади: 2");
    expect(screen.text).toContain("Тўлов: 1");
    expect(screen.text).toContain("Тўланиши керак: 1 000 ₸");
    for (const p of ["w", "a"]) {
      await s.callback(PARTNER, `sp:${p}`, screen.id);
      expect(screen.text).toContain(uz.role.periods[p]);
    }
    expect(screen.text).not.toMatch(/user\d|Клиент\d|№\d/);
    // Чужой (не партнёр) — старая кнопка
    await prepare(s, 5);
    await s.callback(5, "sp:m", s.last(5)!.id);
    expect(s.tg.answers.at(-1)?.text).toBe(uz.oldButton);
  });
});

describe("📤 Выгрузка", () => {
  it("фильтры одним сообщением; xlsx — 3 листа, правильные строки по фильтру", async () => {
    const s = new Sim();
    await setup(s);
    const a = await paid(s, 1, partnerSource("salon111"));
    const b = await paid(s, 2, partnerSource("dokon222"));
    await s.start(ADMIN);
    await s.click(ADMIN, staff.btn.export);
    const screen = s.last(ADMIN)!;
    expect(screen.text).toContain(S.exTitle);
    await s.click(ADMIN, S.exManager(S.exAll));
    await s.click(ADMIN, "@aziz");
    expect(screen.text).toContain("Менеджер: @aziz");
    await s.click(ADMIN, S.exDownload);
    const doc = s.tg.to(ADMIN).at(-1)!;
    expect(doc.type).toBe("document");
    expect(doc.fileName).toBe("inviteizi-2026-11.xlsx");
    const files = unzip(doc.media as Uint8Array);
    expect(Object.keys(files)).toEqual(expect.arrayContaining(["[Content_Types].xml", "xl/workbook.xml", "xl/worksheets/sheet1.xml", "xl/worksheets/sheet2.xml", "xl/worksheets/sheet3.xml"]));
    expect(files["xl/workbook.xml"]).toMatch(/Оплаты.*Выплаты.*Долги/);
    const pays = files["xl/worksheets/sheet1.xml"];
    expect(pays).toContain(`<v>${a.number}</v>`);
    expect(pays).not.toContain(`<v>${b.number}</v>`);
    expect(files["xl/worksheets/sheet3.xml"]).toContain("Салон Малика");

    // Партнёр владельца — через выбор партнёра
    await s.click(ADMIN, S.exManager("@aziz"));
    await s.click(ADMIN, S.exAll);
    await s.click(ADMIN, S.exPartner(S.exAll));
    await s.click(ADMIN, "Дўкон владельца");
    await s.click(ADMIN, S.exDownload);
    const second = unzip(s.tg.to(ADMIN).at(-1)!.media as Uint8Array)["xl/worksheets/sheet1.xml"];
    expect(second).toContain(`<v>${b.number}</v>`);
    expect(second).not.toContain(`<v>${a.number}</v>`);
  });

  it("xlsx: спецсимволы экранируются, пустые ячейки пропускаются, zip читается", () => {
    const files = unzip(buildXlsx([{ name: "Тест/[1]", rows: [["A&B", "<c>", null, 1500], ["ў қ ғ ҳ", "", 0, "x\u0001"]] }]));
    expect(files["xl/workbook.xml"]).toContain('name="Тест  1 "');
    expect(files["xl/worksheets/sheet1.xml"]).toContain("A&amp;B");
    expect(files["xl/worksheets/sheet1.xml"]).toContain("&lt;c&gt;");
    expect(files["xl/worksheets/sheet1.xml"]).toContain("ў қ ғ ҳ");
    expect(files["xl/worksheets/sheet1.xml"]).not.toContain("\u0001");
  });

  it("лимиты: кнопки и данные кнопок", () => {
    const L = "Ш".repeat(80);
    for (const t of [S.exPartner(L).slice(0, 60), S.exManager(L).slice(0, 60), S.exDownload, ...Object.values(S.periods), ...Object.values(S.sections), ...Object.values(uz.role.periods), ...Object.values(ru.role.periods)]) {
      expect(t.length, t).toBeLessThanOrEqual(TG_LIMITS.button);
    }
    for (const d of ["ex:pp:m0:2147483647:9007199254740991:99", "ex:dl:m0:2147483647:9007199254740991", "st:d:money", "sm:y:fn", "sp:a"]) {
      expect(Buffer.byteLength(d), d).toBeLessThanOrEqual(TG_LIMITS.callbackData);
    }
    for (const tx of [uz, ru]) {
      expect(tx.role.statsText({ period: L, scanned: 99999, paid: 99999, earned: "1 000 000 ₸", paidOut: "1 000 000 ₸", due: "1 000 000 ₸", link: L }).length).toBeLessThanOrEqual(TG_LIMITS.message);
    }
  });
});
