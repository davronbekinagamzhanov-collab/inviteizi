/** Фото клиента: «📷 Таклифномага расмларингизни қўшасизми?» (только у дизайнов с фото) */
import type { Ctx, Result, Step } from "./types";
import { after, backRow, data, ib, inline, send } from "./util";
import { getDesign } from "@/templates/registry";
import { PHOTO_MAX_BYTES, PHOTO_MAX_COUNT, PhotoFormatError, PhotoTooBigError } from "../own-photo";

/** Дизайн умеет показывать фото клиента и бот умеет их сохранять */
export function photoStepFor(c: Ctx) {
  return Boolean(c.s.templateId && getDesign(c.s.templateId)?.clientPhotos && c.deps.savePhoto);
}

/** После имён: дизайн с фото → вопрос про фото, иначе как раньше */
export function afterNames(c: Ctx): Result {
  if (c.s.ret) return { to: "review" };
  return { to: photoStepFor(c) ? "photoAsk" : "relation" };
}

const next = (c: Ctx): Result => ({ to: after(c, "relation") });

export const photoAsk: Step = {
  async ask(c) {
    const p = c.tx.photo;
    await send(c, p.ask, inline([[ib(c, p.yes, "yes"), ib(c, p.no, "no")], [ib(c, p.example, "ex")], backRow(c)]));
  },
  async onButton(c, v) {
    if (v === "yes") return { to: "photoUpload" };
    if (v === "no") {
      // Были фото (правка заказа) — очищаем явно; не было — поле не трогаем (база до миграции)
      const d = data(c);
      if (d.photos?.length) d.photos = [];
      else delete d.photos;
      return next(c);
    }
    if (v === "ex") {
      await send(c, c.tx.photo.exampleText(`${c.deps.env.publicBaseUrl}/demo/${c.s.templateId}`));
      return { stay: true };
    }
    return null;
  },
};

/** Картинка ли это: фото Telegram или файл-изображение (HEIC с айфона приходит файлом) */
function imageFile(c: Ctx): { fileId: string; size: number | null } | null {
  const u = c.u;
  if (u.kind === "photo") return { fileId: u.fileId, size: null };
  if (u.kind === "document") {
    const byMime = u.mimeType?.startsWith("image/");
    const byName = /\.(jpe?g|png|webp|heic|heif|gif|bmp|tiff?)$/i.test(u.fileName ?? "");
    if (byMime || byName) return { fileId: u.fileId, size: u.fileSize };
  }
  return null;
}

export const photoUpload: Step = {
  async ask(c) {
    delete c.s.photoMsg;
    const p = c.tx.photo;
    const have = data(c).photos?.length ?? 0;
    const rows = have ? [[ib(c, p.done, "done"), ib(c, p.again, "again")]] : [];
    await send(c, p.uploadAsk, inline([...rows, backRow(c)]));
  },
  async onButton(c, v) {
    if (v === "done") {
      if (!data(c).photos?.length) return { hint: c.tx.photo.needPhoto };
      return next(c);
    }
    if (v === "again") {
      data(c).photos = [];
      delete c.s.photoMsg;
      await send(c, c.tx.photo.uploadAsk, inline([backRow(c)]));
      return { stay: true };
    }
    return null;
  },
  async onMessage(c) {
    const p = c.tx.photo;
    const file = imageFile(c);
    if (!file) return { hint: p.needPhoto };
    const d = data(c);
    const list = (d.photos ??= []);
    if (list.length >= PHOTO_MAX_COUNT) return { hint: p.full(PHOTO_MAX_COUNT) };
    if (file.size && file.size > PHOTO_MAX_BYTES) return { hint: p.tooBig };
    const save = c.deps.savePhoto;
    if (!save) return next(c);
    let url: string;
    try {
      url = await save(file.fileId, c.user.id);
    } catch (e) {
      if (e instanceof PhotoTooBigError) return { hint: p.tooBig };
      if (e instanceof PhotoFormatError) return { hint: p.badFormat };
      // Адрес файла Telegram содержит токен — в лог только имя ошибки
      console.error("savePhoto", e instanceof Error ? e.name : "Error");
      return { hint: p.saveFailed };
    }
    list.push(url);
    if (list.length >= PHOTO_MAX_COUNT) {
      await send(c, p.full(PHOTO_MAX_COUNT));
      return next(c);
    }
    // Одно «живое» сообщение: «📷 Расмлар: 2 та ✅» правится, новое — только если старое уже не изменить
    const text = p.accepted(list.length);
    const markup = inline([[ib(c, p.done, "done"), ib(c, p.again, "again")], backRow(c)]);
    if (c.s.photoMsg) {
      try {
        await c.deps.tg.editMessageText(c.chatId, c.s.photoMsg, text, { markup });
        return { stay: true };
      } catch {
        // сообщение удалено или слишком старое — пришлём новое
      }
    }
    c.s.photoMsg = (await send(c, text, markup)).messageId;
    return { stay: true };
  },
};
