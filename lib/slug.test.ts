import { describe, expect, it } from "vitest";
import { isReservedSlug, isValidSlug, slugify } from "./slug";

describe("slugify — транслит узбекской кириллицы в адрес", () => {
  it("Азиз + Мадина → aziz-madina", () => {
    expect(slugify("Азиз", "Мадина")).toBe("aziz-madina");
  });

  it("Ғайрат + Ҳилола → gayrat-hilola (ғ→g, ҳ→h)", () => {
    expect(slugify("Ғайрат", "Ҳилола")).toBe("gayrat-hilola");
  });

  it("Шаҳзода → shahzoda", () => {
    expect(slugify("Шаҳзода")).toBe("shahzoda");
  });

  it("Муҳаммадали → muhammadali", () => {
    expect(slugify("Муҳаммадали")).toBe("muhammadali");
  });

  it("ў→o, қ→q, ч→ch, ё→yo, ю→yu, я→ya, ж→j, х→x, ц→ts", () => {
    expect(slugify("Ўктам")).toBe("oktam");
    expect(slugify("Қодир")).toBe("qodir");
    expect(slugify("Чўлпон")).toBe("cholpon");
    expect(slugify("Ёқутхон")).toBe("yoqutxon");
    expect(slugify("Юлдуз")).toBe("yulduz");
    expect(slugify("Ямина")).toBe("yamina");
    expect(slugify("Жасур")).toBe("jasur");
    expect(slugify("Хуршида")).toBe("xurshida");
    expect(slugify("Цеҳ")).toBe("tseh");
  });

  it("ъ, ь и апострофы убираются", () => {
    expect(slugify("Маъмура")).toBe("mamura");
    expect(slugify("Ильдар")).toBe("ildar");
    expect(slugify("Ma'mura", "O‘g‘iloy")).toBe("mamura-ogiloy");
    expect(slugify("Шавкат ʼАли")).toBe("shavkat-ali");
  });

  it("пробелы, эмодзи и знаки → один дефис, по краям нет дефисов", () => {
    expect(slugify("  Азиз  ❤️ ", " Мадина!! 💍")).toBe("aziz-madina");
    expect(slugify("Абдураҳмонжон ва Абдуллоҳжон")).toBe("abdurahmonjon-va-abdullohjon");
  });

  it("латиница и цифры остаются, всё в нижнем регистре", () => {
    expect(slugify("Aziz", "MADINA 2026")).toBe("aziz-madina-2026");
  });

  it("обрезается до 40 знаков без дефиса на конце", () => {
    const s = slugify("Абдураҳмонжон Абдуллоҳжон Муҳаммадали Шаҳзода");
    expect(s).toBe("abdurahmonjon-abdullohjon-muhammadali-sh");
    // дефис на 40-м знаке срезается
    expect(slugify("Абдураҳмонжон Абдуллоҳжон Муҳаммадалиев Ш")).toBe("abdurahmonjon-abdullohjon-muhammadaliev");
  });

  it("пустое или без букв → taklif", () => {
    expect(slugify()).toBe("taklif");
    expect(slugify("", "  ")).toBe("taklif");
    expect(slugify("❤️💍")).toBe("taklif");
  });

  it("слова, занятые страницами сайта, получают хвост -toy", () => {
    expect(slugify("Demo")).toBe("demo-toy");
    expect(slugify("Catalog")).toBe("catalog-toy");
  });
});

describe("isValidSlug / isReservedSlug", () => {
  it("принимает то, что даёт slugify, и номерной хвост", () => {
    expect(isValidSlug("aziz-madina")).toBe(true);
    expect(isValidSlug("aziz-madina-2")).toBe(true);
  });

  it("отклоняет кириллицу, пробелы, двойные дефисы, края, длинное и занятое", () => {
    expect(isValidSlug("азиз")).toBe(false);
    expect(isValidSlug("aziz madina")).toBe(false);
    expect(isValidSlug("aziz--madina")).toBe(false);
    expect(isValidSlug("-aziz")).toBe(false);
    expect(isValidSlug("a".repeat(61))).toBe(false);
    expect(isValidSlug("demo")).toBe(false);
    expect(isReservedSlug("api")).toBe(true);
    expect(isReservedSlug("dev")).toBe(true); // app/dev — служебные страницы
    expect(isReservedSlug("aziz")).toBe(false);
  });
});

describe("запретные адреса: код и база совпадают", () => {
  it("RESERVED_SLUGS = список в последней миграции orders_slug_check", async () => {
    const { readdirSync, readFileSync } = await import("node:fs");
    const { RESERVED_SLUGS } = await import("./slug");
    const dir = "supabase/migrations";
    const last = readdirSync(dir)
      .sort()
      .map((f) => readFileSync(`${dir}/${f}`, "utf8"))
      .filter((s) => s.includes("add constraint orders_slug_check"))
      .at(-1)!;
    const inSql = new Set([...last.split("slug not in")[1].split(")")[0].matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]));
    expect(inSql).toEqual(RESERVED_SLUGS);
  });
});
