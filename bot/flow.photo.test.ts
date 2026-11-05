import { describe, expect, it, vi } from "vitest";
import { uz } from "@/texts/bot-uz";
import { ru } from "@/texts/bot-ru";
import { runCron } from "./cron";
import { Sim } from "./testing/sim";
import { startUz, pickDesign, setChoices } from "./testing/paths";
import { PhotoFormatError, PhotoTooBigError } from "./own-photo";

// Дизайн, выбранный первым в каталоге никоҳ, считаем «с фото клиента»
vi.mock("@/templates/registry", async (orig) => {
  const m = await orig<typeof import("@/templates/registry")>();
  return { ...m, getDesign: (id: string) => { const d = m.getDesign(id); return d && { ...d, clientPhotos: true }; } };
});

function photoSim() {
  const s = new Sim();
  const saved: string[] = [];
  const removed: string[][] = [];
  s.deps.savePhoto = async (fileId) => {
    if (fileId === "BIG") throw new PhotoTooBigError();
    if (fileId === "PDF") throw new PhotoFormatError();
    saved.push(fileId);
    return `https://x.supabase.co/storage/v1/object/public/photos/client/${fileId}.webp`;
  };
  s.deps.removePhotos = async (urls) => void removed.push(urls);
  return { s, saved, removed };
}

async function toPhotoAsk(s: Sim, id: number) {
  await startUz(s, id);
  await s.click(id, uz.category.nikoh);
  await pickDesign(s, id, "animated");
  await s.text(id, "Азиз");
  await s.text(id, "Мадина");
  expect(s.lastText(id)).toBe(uz.photo.ask);
}

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

describe("фото клиента в боте", () => {
  it("тексты на двух языках, простыми словами", () => {
    expect(uz.photo.ask).toContain("Таклифномага расмларингизни қўшасизми?");
    expect(ru.photo.ask).toContain("Добавить ваши фото");
    expect(Object.keys(ru.photo)).toEqual(Object.keys(uz.photo));
  });

  it("❌ Йўқ — дальше как раньше, в заказе нет фото", async () => {
    const { s } = photoSim();
    await toPhotoAsk(s, 1);
    await s.click(1, uz.photo.no);
    expect((await s.user(1))!.step).toBe("relation");
    await finishForm(s, 1);
    expect(s.lastText(1)).toContain(uz.photo.review(0));
    await s.click(1, uz.review.confirm);
    const [o] = await s.repo.listOrdersByUser(1);
    expect(o.data.photos).toBeUndefined();
  });

  it("❓ Мисол — ссылка на демо дизайна, вопрос остаётся", async () => {
    const { s } = photoSim();
    await toPhotoAsk(s, 1);
    await s.click(1, uz.photo.example);
    expect(s.lastText(1)).toMatch(/\/demo\//);
    expect((await s.user(1))!.step).toBe("photoAsk");
  });

  it("✅ Ҳа: фото и файл-картинка (HEIC), третье фото само ведёт дальше", async () => {
    const { s, saved } = photoSim();
    await toPhotoAsk(s, 1);
    await s.click(1, uz.photo.yes);
    expect(s.lastText(1)).toBe(uz.photo.uploadAsk);
    await s.photo(1, "P1");
    expect(s.lastText(1)).toBe(uz.photo.accepted(1));
    await s.document(1, "P2", "image/heic", "IMG_0001.HEIC");
    await s.document(1, "P3", "application/octet-stream", "photo.jpg");
    expect(saved).toEqual(["P1", "P2", "P3"]);
    expect((await s.user(1))!.step).toBe("relation");
    await finishForm(s, 1);
    expect(s.lastText(1)).toContain(uz.photo.review(3));
    await s.click(1, uz.review.confirm);
    const [o] = await s.repo.listOrdersByUser(1);
    expect(o.data.photos).toHaveLength(3);
  });

  it("одно фото и «Тайёр»; «Қайтадан» очищает", async () => {
    const { s } = photoSim();
    await toPhotoAsk(s, 1);
    await s.click(1, uz.photo.yes);
    await s.photo(1, "P1");
    await s.click(1, uz.photo.again);
    await s.photo(1, "P2");
    await s.click(1, uz.photo.done);
    expect((await s.user(1))!.step).toBe("relation");
    const st = (await s.user(1))!.state as { data?: { photos?: string[] } };
    expect(st.data?.photos).toEqual(["https://x.supabase.co/storage/v1/object/public/photos/client/P2.webp"]);
  });

  it("ошибки: большой файл, не картинка, PDF — подсказка и тот же шаг", async () => {
    const { s } = photoSim();
    await toPhotoAsk(s, 1);
    await s.click(1, uz.photo.yes);
    await s.photo(1, "BIG");
    expect(s.tg.to(1).map((m) => m.text)).toContain(uz.photo.tooBig);
    await s.photo(1, "PDF");
    expect(s.tg.to(1).map((m) => m.text)).toContain(uz.photo.badFormat);
    await s.document(1, "D1", "application/pdf", "chek.pdf");
    await s.text(1, "салом");
    expect(s.tg.to(1).map((m) => m.text)).toContain(uz.photo.needPhoto);
    await s.document(1, "D2", "image/jpeg", "big.jpg", 11 * 1024 * 1024);
    expect((await s.user(1))!.step).toBe("photoUpload");
  });

  it("правка из сводки: «✏️ Расмлар» → «Йўқ» убирает фото", async () => {
    const { s } = photoSim();
    await toPhotoAsk(s, 1);
    await s.click(1, uz.photo.yes);
    await s.photo(1, "P1");
    await s.click(1, uz.photo.done);
    await finishForm(s, 1);
    await s.click(1, uz.photo.edit);
    await s.click(1, uz.photo.no);
    expect(s.lastText(1)).toContain(uz.photo.review(0));
  });

  it("без поддержки фото у бота (нет savePhoto) шага нет", async () => {
    const s = new Sim();
    await startUz(s, 1);
    await s.click(1, uz.category.nikoh);
    await pickDesign(s, 1, "animated");
    await s.text(1, "Азиз");
    await s.text(1, "Мадина");
    expect((await s.user(1))!.step).toBe("relation");
  });

  it("cron: фото удаляются через 30 дней после конца приглашения, не раньше", async () => {
    const { s, removed } = photoSim();
    await toPhotoAsk(s, 1);
    await s.click(1, uz.photo.yes);
    await s.photo(1, "P1");
    await s.click(1, uz.photo.done);
    await finishForm(s, 1);
    await s.click(1, uz.review.confirm);
    const [o] = await s.repo.listOrdersByUser(1);
    // Тадбир 14 ноября → ссылка до 14 декабря → фото до 13 января
    s.clock = new Date("2027-01-10T00:00:00Z");
    expect((await runCron(s.deps)).photosRemoved).toBe(0);
    s.clock = new Date("2027-01-15T00:00:00Z");
    expect((await runCron(s.deps)).photosRemoved).toBe(1);
    expect(removed).toEqual([["https://x.supabase.co/storage/v1/object/public/photos/client/P1.webp"]]);
    expect((await s.repo.getOrder(o.id))!.data.photos ?? []).toEqual([]);
    expect((await runCron(s.deps)).photosRemoved).toBe(0);
  });
});
