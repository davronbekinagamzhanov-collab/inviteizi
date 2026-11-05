import { describe, expect, it } from "vitest";
import { uz } from "@/texts/bot-uz";
import { ru } from "@/texts/bot-ru";
import { designsFor } from "./flow/util";
import { catalogList, PAGE } from "./flow/steps-order";
import { Sim } from "./testing/sim";
import { startUz, pickDesign, setChoices } from "./testing/paths";

// Настоящий реестр (без подмены): шаг фото — только у дизайнов с clientPhotos
function photoSim() {
  const s = new Sim();
  s.deps.savePhoto = async (fileId) => `https://x.supabase.co/storage/v1/object/public/photos/client/${fileId}.webp`;
  s.deps.removePhotos = async () => undefined;
  return s;
}

const state = async (s: Sim, id: number) => (await s.user(id))!.state as { templateId?: string; data?: { photos?: string[] } };

async function finishForm(s: Sim, id: number) {
  await s.click(id, "Фарзандларимиз");
  await s.text(id, "Каримовлар оиласи");
  await s.click(id, uz.form.sideNo);
  await s.click(id, "14");
  await s.click(id, "18:00");
  await s.text(id, "«Наврўз» тўйхонаси");
  await s.text(id, "Сайрам, Амир Темур кўчаси 45");
  await s.text(id, uz.event.skip);
  await s.click(id, uz.event.noMore);
  await setChoices(s, id, { text: 1, music: "none", rsvp: false });
}

describe("пометка «с фото» и шаг фото по дизайну", () => {
  it("подпись в каталоге: строка про фото на двух языках", () => {
    expect(uz.catalog.withPhoto).toBe("📷 Расмингизни қўйса бўлади");
    expect(ru.catalog.withPhoto).toBe("📷 Можно добавить своё фото");
  });

  it("дизайн без фото: после имён сразу «кем приходится», вопроса про фото нет", async () => {
    const plain = catalogList({ s: { occasion: "nikoh" } }).find((d) => !d.clientPhotos);
    expect(plain).toBeDefined();
    const s = photoSim();
    await startUz(s, 1);
    await s.click(1, uz.category.nikoh);
    await pickDesign(s, 1, plain!.id);
    expect((await state(s, 1)).templateId).toBe(plain!.id);
    await s.text(1, "Азиз");
    await s.text(1, "Мадина");
    expect(s.lastText(1)).not.toBe(uz.photo.ask);
    expect((await s.user(1))!.step).toBe("relation");
  });

  it("подпись дизайна с фото содержит строку про фото, без фото — нет", async () => {
    const s = photoSim();
    await startUz(s, 1);
    await s.click(1, uz.category.nikoh);
    const page = catalogList({ s: { occasion: "nikoh" } }).slice(0, PAGE);
    expect(page.some((d) => d.clientPhotos) && page.some((d) => !d.clientPhotos)).toBe(true);
    for (const d of page) {
      const line = s.lastText(1).split("\n").find((x) => x.includes(`№${d.number} `));
      expect(line, d.id).toBeDefined();
      expect(line!.includes("📷"), d.id).toBe(Boolean(d.clientPhotos));
    }
  });

  it("смена дизайна до оплаты на дизайн без фото — прежние фото не переходят", async () => {
    const withPhoto = designsFor("nikoh", "animated")[0];
    expect(withPhoto.clientPhotos).toBe(true);
    const s = photoSim();
    await startUz(s, 1);
    await s.click(1, uz.category.nikoh);
    await pickDesign(s, 1, "animated");
    await s.text(1, "Азиз");
    await s.text(1, "Мадина");
    await s.click(1, uz.photo.yes);
    await s.photo(1, "P1");
    await s.click(1, uz.photo.done);
    await finishForm(s, 1);
    expect((await state(s, 1)).data?.photos).toHaveLength(1);
    // ✏️ Дизайн → другой формат → дизайн без фото
    await s.click(1, uz.review.editDesign);
    const target = catalogList({ s: { occasion: "nikoh" } }).find((d) => !d.clientPhotos)!;
    expect(target).toBeDefined();
    await pickDesign(s, 1, target.id);
    const st = await state(s, 1);
    expect(st.templateId).toBe(target.id);
    expect(st.data?.photos ?? []).toEqual([]);
  });

  it("наҳорги ош: ни у одного дизайна нет фото клиента — ни строки 📷 в подписи, ни шага фото", async () => {
    const formats = ["animated", "scroll", "simple"] as const;
    const all = formats.flatMap((f) => designsFor("nahorgi", f));
    expect(all.length).toBeGreaterThan(0);
    for (const d of all) expect(d.clientPhotos, d.id).toBeFalsy();
    const list = catalogList({ s: { occasion: "nahorgi" } });
    const s = photoSim();
    await startUz(s, 1);
    await s.click(1, uz.category.nahorgi);
    // каждая страница каталога: ни в подписях обложек, ни в строках меню нет «📷»
    for (let i = 0; i < list.length; i += PAGE) {
      if (i > 0) await s.click(1, "▶");
      expect(s.lastText(1)).toContain(`№${list[i].number} `);
      expect(s.lastText(1)).not.toContain("📷");
      for (const m of s.tg.to(1).filter((m) => m.type === "photo")) expect(m.text).not.toContain("📷");
    }
    await pickDesign(s, 1);
    await s.text(1, "Жасурбек");
    expect((await s.user(1))!.step).not.toBe("photoAsk");
  });

});
