import { describe, expect, it } from "vitest";
import { uz } from "@/texts/bot-uz";
import { ru } from "@/texts/bot-ru";
import { designsFor } from "./flow/util";
import { Sim } from "./testing/sim";
import { startUz } from "./testing/paths";

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
  await s.click(id, uz.text.pick(1));
  await s.click(id, uz.music.none);
  await s.click(id, uz.rsvp.no);
}

describe("пометка «с фото» и шаг фото по дизайну", () => {
  it("подпись в каталоге: строка про фото на двух языках", () => {
    expect(uz.catalog.withPhoto).toBe("📷 Расмингизни қўйса бўлади");
    expect(ru.catalog.withPhoto).toBe("📷 Можно добавить своё фото");
  });

  it("дизайн без фото: после имён сразу «кем приходится», вопроса про фото нет", async () => {
    const plain = designsFor("nikoh", "simple").find((d) => !d.clientPhotos);
    expect(plain).toBeDefined();
    const s = photoSim();
    await startUz(s, 1);
    await s.click(1, uz.category.nikoh);
    await s.click(1, new RegExp(uz.format.names.simple));
    // первый дизайн без фото в этом формате
    const idx = designsFor("nikoh", "simple").indexOf(plain!);
    for (let k = 0; k < idx; k++) await s.click(1, "▶");
    await s.click(1, uz.catalog.buy);
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
    await s.click(1, new RegExp(uz.format.names.animated));
    const first = designsFor("nikoh", "animated")[0];
    const shown = s.tg.to(1).map((m) => m.text).filter((x) => x.includes(`№${first.number} `));
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.at(-1)!.includes(uz.catalog.withPhoto)).toBe(Boolean(first.clientPhotos));
  });

  it("смена дизайна до оплаты на дизайн без фото — прежние фото не переходят", async () => {
    const withPhoto = designsFor("nikoh", "animated")[0];
    expect(withPhoto.clientPhotos).toBe(true);
    const s = photoSim();
    await startUz(s, 1);
    await s.click(1, uz.category.nikoh);
    await s.click(1, new RegExp(uz.format.names.animated));
    await s.click(1, uz.catalog.buy);
    await s.text(1, "Азиз");
    await s.text(1, "Мадина");
    await s.click(1, uz.photo.yes);
    await s.photo(1, "P1");
    await s.click(1, uz.photo.done);
    await finishForm(s, 1);
    expect((await state(s, 1)).data?.photos).toHaveLength(1);
    // ✏️ Дизайн → другой формат → дизайн без фото
    await s.click(1, uz.review.editDesign);
    await s.click(1, new RegExp(uz.format.names.simple));
    const target = designsFor("nikoh", "simple")[0];
    expect(target.clientPhotos).toBeFalsy();
    await s.click(1, uz.catalog.buy);
    const st = await state(s, 1);
    expect(st.templateId).toBe(target.id);
    expect(st.data?.photos ?? []).toEqual([]);
  });

});
