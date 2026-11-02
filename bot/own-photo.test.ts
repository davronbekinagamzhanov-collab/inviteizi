import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { GrammyError } from "grammy";
import { copyClientPhoto, isHeic, photoPath, PhotoFormatError, PhotoTooBigError, toWebp, PHOTO_MAX_BYTES } from "./own-photo";

const jpeg = () => sharp({ create: { width: 3000, height: 2000, channels: 3, background: "#c9a" } }).jpeg().toBuffer();

function io(body: Uint8Array | Buffer, opts: { tooBig?: boolean; uploaded?: Uint8Array[] } = {}) {
  return {
    getFileUrl: async () => {
      if (opts.tooBig) throw new GrammyError("x", { ok: false, error_code: 400, description: "Bad Request: file is too big" }, "getFile", {});
      return "https://api.telegram.org/file/botTOKEN/photos/a.jpg";
    },
    fetch: (async (url: string, init?: RequestInit) => {
      if (init?.method === "HEAD") return new Response(null, { status: url.includes("photos/") ? 200 : 404 });
      return new Response(new Uint8Array(body));
    }) as typeof fetch,
    upload: async (bytes: Uint8Array) => {
      opts.uploaded?.push(bytes);
      return "https://x.supabase.co/storage/v1/object/public/photos/client/abc.webp";
    },
  };
}

describe("фото клиента", () => {
  it("большое JPG сжимается в WebP не больше 1600 px", async () => {
    const out = await toWebp(new Uint8Array(await jpeg()));
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("webp");
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBe(1600);
  });

  it("PNG тоже принимается", async () => {
    const png = await sharp({ create: { width: 400, height: 900, channels: 4, background: "#fff" } }).png().toBuffer();
    const meta = await sharp(await toWebp(new Uint8Array(png))).metadata();
    expect(meta).toMatchObject({ format: "webp", width: 400, height: 900 });
  });

  it("не картинка — понятная ошибка, а не падение", async () => {
    await expect(toWebp(new TextEncoder().encode("%PDF-1.4 hello"))).rejects.toBeInstanceOf(PhotoFormatError);
  });

  it("узнаёт HEIC с айфона по заголовку", () => {
    const head = (brand: string) => new Uint8Array([0, 0, 0, 24, ...Buffer.from(`ftyp${brand}`)]);
    expect(isHeic(head("heic"))).toBe(true);
    expect(isHeic(head("mif1"))).toBe(true);
    expect(isHeic(head("isom"))).toBe(false);
  });

  it("путь: скачать → сжать → загрузить → проверить адрес", async () => {
    const uploaded: Uint8Array[] = [];
    const url = await copyClientPhoto("f1", io(await jpeg(), { uploaded }));
    expect(url).toContain("/photos/");
    expect(uploaded).toHaveLength(1);
  });

  it("больше 10 МБ — отказ (Telegram или сам файл)", async () => {
    await expect(copyClientPhoto("f1", io(await jpeg(), { tooBig: true }))).rejects.toBeInstanceOf(PhotoTooBigError);
    await expect(copyClientPhoto("f1", io(new Uint8Array(PHOTO_MAX_BYTES + 1)))).rejects.toBeInstanceOf(PhotoTooBigError);
  });

  it("путь в бакете по публичному адресу", () => {
    expect(photoPath("https://x.supabase.co/storage/v1/object/public/photos/client/a%20b.webp")).toBe("client/a b.webp");
    expect(photoPath("https://images.unsplash.com/photo-1")).toBeNull();
  });
});
