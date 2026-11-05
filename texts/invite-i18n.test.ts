/**
 * v2, часть 9: три языка приглашения.
 *  - русский и казахский закрывают ВСЕ гостевые тексты (нет узбекских букв и пустых мест);
 *  - варианты текста — те же id, что в узбекском, для всех тадбиров и «кем приходится»;
 *  - заголовки дизайнов переведены для всех дизайнов, где они есть;
 *  - стартовый язык страницы: ?lang → выбор гостя → язык телефона → узбекский;
 *  - казахский родительный падеж по гармонии гласных.
 */
import { describe, expect, it } from "vitest";
import type { InvitationData, Occasion, Relation } from "@/lib/types";
import { pickLang } from "@/templates/blocks/useInvitation";
import { kkGen, kk, kkHeadings } from "./invite-kk";
import { ru, ruHeadings } from "./invite-ru";
import { textsFor, tPlain } from "./uz-cyrl";

/** Ключи, которые видит гость на странице приглашения */
const GUEST = Object.keys(ru) as (keyof typeof ru)[];

const RELATIONS: Relation[] = ["farzand", "ogil", "qiz", "nabira", "uka", "ona", "ota", "ozimiz"];
const OCCASIONS: Occasion[] = ["nikoh", "sunnat", "nahorgi", "yubiley"];
const ev = { kind: "nikohBazm" as const, date: "2027-06-12", time: "18:00", venueName: "Зал", address: "Сайрам" };

function samples(): InvitationData[] {
  const out: InvitationData[] = [];
  for (const occasion of OCCASIONS)
    for (const relation of RELATIONS)
      for (const person of ["Азиз", "Азиз ва Сардор"])
        out.push({ occasion, relation, groom: "Азиз", bride: "Мадина", person, cause: "nikoh", age: 60, hosts: "Оила", events: [ev] });
  return out;
}

/** Все строки объекта: функции вызываем с примерными данными */
function leaves(node: unknown, path: string, out: [string, string][] = []): [string, string][] {
  if (typeof node === "string") out.push([path, node]);
  else if (typeof node === "function") {
    const fn = node as (...a: unknown[]) => unknown;
    const tries: unknown[][] = fn.length === 0 ? [[]] : [];
    if (fn.length >= 1) {
      for (const d of samples()) tries.push([d, "12 декабря"]);
      tries.push([3, 5, 2027], [2, "18:00"], ["18:00"], ["ogil", "Азиз"], ["Автор"], ["12.06.2027"]);
    }
    for (const args of tries) {
      try {
        const v = fn(...args);
        leaves(v, `${path}()`, out);
      } catch {
        // неподходящие аргументы — пропускаем
      }
    }
  } else if (Array.isArray(node)) node.forEach((v, i) => leaves(v, `${path}[${i}]`, out));
  else if (node && typeof node === "object") for (const [k, v] of Object.entries(node)) leaves(v, `${path}.${k}`, out);
  return out;
}

describe("переводы приглашения", () => {
  it("русский и казахский закрывают одни и те же гостевые ключи, у каждого раздела те же подключи", () => {
    expect(Object.keys(kk).sort()).toEqual(GUEST.map(String).sort());
    const uz = tPlain as unknown as Record<string, unknown>;
    for (const key of GUEST) {
      expect(uz[key], `uz.${String(key)}`).toBeDefined();
      const u = uz[key];
      if (u && typeof u === "object" && !Array.isArray(u) && key !== "design") {
        expect(Object.keys((ru as unknown as Record<string, object>)[key]).sort(), `ru.${String(key)}`).toEqual(Object.keys(u).sort());
        expect(Object.keys((kk as unknown as Record<string, object>)[key]).sort(), `kk.${String(key)}`).toEqual(Object.keys(u).sort());
      }
      if (Array.isArray(u)) {
        expect(((ru as unknown as Record<string, unknown[]>)[key]).length).toBe(u.length);
        expect(((kk as unknown as Record<string, unknown[]>)[key]).length).toBe(u.length);
      }
    }
  });

  it("в русском нет узбекских букв, в казахском — ў и ҳ; пустых строк нет", () => {
    for (const [path, text] of leaves(ru, "ru")) {
      expect(text, path).not.toMatch(/[ўҳқғЎҲҚҒ]/);
      if (!path.includes(".meta")) expect(text.trim().length, path).toBeGreaterThan(0);
    }
    for (const [path, text] of leaves(kk, "kk")) {
      expect(text, path).not.toMatch(/[ўҳЎҲ]/);
      if (!path.includes(".meta")) expect(text.trim().length, path).toBeGreaterThan(0);
    }
  });

  it("варианты текста — те же id для всех тадбиров и «кем приходится»; свой текст — перевод клиента или узбекский", () => {
    for (const d of samples()) {
      const ids = tPlain.inviteOptions(d).map((o) => o.id);
      expect(ru.inviteOptions(d).map((o) => o.id), `${d.occasion}/${d.relation}`).toEqual(ids);
      expect(kk.inviteOptions(d).map((o) => o.id), `${d.occasion}/${d.relation}`).toEqual(ids);
      for (const o of [...ru.inviteOptions(d), ...kk.inviteOptions(d)]) expect(o.body).not.toMatch(/undefined|null|NaN|  /);
    }
    const own: InvitationData = { occasion: "nikoh", groom: "А", bride: "Б", hosts: "О", events: [ev], customText: "Ўз матним", customTexts: { ru: "Мой текст" } };
    expect(ru.invite(own).body).toBe("Мой текст");
    expect(kk.invite(own).body).toBe("Ўз матним");
  });

  it("заголовки дизайнов переведены для всех дизайнов, где они есть", () => {
    expect(Object.keys(ruHeadings).sort()).toEqual(Object.keys(kkHeadings).sort());
    for (const id of Object.keys(ruHeadings)) expect(Object.keys(kkHeadings[id]).sort(), id).toEqual(Object.keys(ruHeadings[id]).sort());
  });

  it("textsFor: русский/казахский заменяют гостевые тексты, каталог и названия дизайнов — общие", () => {
    expect(textsFor("ru").countdown.days).toBe("дн.");
    expect(textsFor("kk").rsvp.yes).toBe("Келемін");
    expect(textsFor("ru").designs.muhr).toBe(textsFor("uz").designs.muhr);
    expect(textsFor("uz").rsvp.yes).toBe("Келаман");
    // неразрывный пробел после коротких русских слов
    expect(textsFor("ru").hosts.respect).toBe("С уважением");
  });
});

describe("стартовый язык страницы", () => {
  const all = ["uz", "ru", "kk"] as const;
  it("?lang → выбор гостя → язык телефона → узбекский; невыбранный клиентом язык не берём", () => {
    expect(pickLang([...all], "kk", "ru", ["ru-RU"])).toBe("kk");
    expect(pickLang([...all], null, "ru", ["kk-KZ"])).toBe("ru");
    expect(pickLang([...all], null, null, ["kk-KZ", "ru"])).toBe("kk");
    expect(pickLang(["uz", "ru"], null, null, ["kk-KZ", "ru-RU"])).toBe("ru");
    expect(pickLang(["uz", "ru"], "kk", "kk", ["en-US"])).toBe("uz");
    expect(pickLang([...all], null, null, ["uz-UZ", "ru"])).toBe("uz");
    expect(pickLang(["uz"], "ru", "ru", ["ru"])).toBe("uz");
  });
});

describe("казахский родительный падеж", () => {
  it("по гармонии гласных и последнему звуку", () => {
    expect(kkGen("Мадина")).toBe("Мадинаның");
    expect(kkGen("Азиз")).toBe("Азиздің");
    expect(kkGen("Жасурбек")).toBe("Жасурбектің");
    expect(kkGen("Нурбол")).toBe("Нурболдың");
    expect(kkGen("Ойгул")).toBe("Ойгулдың");
    expect(kkGen("Сардор")).toBe("Сардордың".replace("дың", "ның"));
  });
});
