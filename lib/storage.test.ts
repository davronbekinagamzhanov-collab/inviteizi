/** Хранилище файлов клиентов — Vercel Blob (17.11.2026). Сеть не используется: @vercel/blob подменён */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({ put: [] as unknown[][], del: [] as unknown[][], token: [] as unknown[] }));
vi.mock("@vercel/blob", () => ({
  put: vi.fn(async (pathname: string, _body: unknown, opts: unknown) => {
    calls.put.push([pathname, opts]);
    return { url: `https://store1abc.public.blob.vercel-storage.com/${pathname}` };
  }),
  del: vi.fn(async (urls: unknown, opts: unknown) => void calls.del.push([urls, opts])),
  head: vi.fn(async (p: string) => {
    if (p.includes("missing")) throw Object.assign(new Error("nf"), { name: "BlobNotFoundError" });
    return { url: p };
  }),
}));
vi.mock("@vercel/blob/client", () => ({
  generateClientTokenFromReadWriteToken: vi.fn(async (o: unknown) => {
    calls.token.push(o);
    return "vercel_blob_client_x";
  }),
}));

import {
  blobBaseUrl,
  blobExists,
  publicUrl,
  removeUrls,
  signedUpload,
  storageConfigured,
  StorageUnavailableError,
  uploadFile,
  isOurFileUrl,
} from "./storage";

const TOKEN = "vercel_blob_rw_Store1ABC_secretpart";
beforeEach(() => {
  calls.put.length = calls.del.length = calls.token.length = 0;
  vi.stubEnv("BLOB_READ_WRITE_TOKEN", TOKEN);
  vi.stubEnv("BLOB_PUBLIC_BASE_URL", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("Vercel Blob", () => {
  it("без токена — понятная ошибка «файлы временно недоступны», ничего не отправляется", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    expect(storageConfigured()).toBe(false);
    await expect(uploadFile("photos", "client/a.webp", new Uint8Array([1]), "image/webp")).rejects.toBeInstanceOf(
      StorageUnavailableError,
    );
    await expect(uploadFile("photos", "client/a.webp", new Uint8Array([1]), "image/webp")).rejects.toThrow(
      /временно недоступны/,
    );
    expect(calls.put).toEqual([]);
  });

  it("адрес хранилища — из токена (store id в нижнем регистре)", () => {
    expect(blobBaseUrl()).toBe("https://store1abc.public.blob.vercel-storage.com");
    expect(publicUrl("music", "own/abc.mp3")).toBe(
      "https://store1abc.public.blob.vercel-storage.com/music/own/abc.mp3",
    );
  });

  it("загрузка: публично, путь bucket/path, без случайного суффикса, кэш на год", async () => {
    const url = await uploadFile("photos", "client/x.webp", new Uint8Array([1, 2]), "image/webp");
    expect(url).toBe("https://store1abc.public.blob.vercel-storage.com/photos/client/x.webp");
    expect(calls.put[0][0]).toBe("photos/client/x.webp");
    expect(calls.put[0][1]).toMatchObject({
      access: "public",
      token: TOKEN,
      contentType: "image/webp",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 31_536_000,
    });
  });

  it("токен для телефона — только на этот путь, размер и типы, не перезаписывает", async () => {
    const r = await signedUpload("music", "own/abc.mp3", { maxBytes: 12 * 1024 * 1024, contentTypes: ["audio/mpeg"] });
    expect(r).toEqual({
      clientToken: "vercel_blob_client_x",
      pathname: "music/own/abc.mp3",
      url: "https://store1abc.public.blob.vercel-storage.com/music/own/abc.mp3",
    });
    expect(calls.token[0]).toMatchObject({
      pathname: "music/own/abc.mp3",
      maximumSizeInBytes: 12 * 1024 * 1024,
      allowedContentTypes: ["audio/mpeg"],
      allowOverwrite: false,
    });
  });

  it("удаление: Blob — одним запросом; старый Supabase — по возможности, ошибка не роняет очистку; чужое не трогаем", async () => {
    const fetchMock = vi.fn(async () => new Response("payment required", { status: 402 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("STORAGE_GATE_SECRET", "s");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await removeUrls([
        "https://store1abc.public.blob.vercel-storage.com/photos/client/a.webp",
        "https://store1abc.public.blob.vercel-storage.com/music/own/b.mp3",
        "https://x.supabase.co/storage/v1/object/public/photos/client/c.webp",
        "https://evil.example/photos/client/d.webp",
      ]);
      expect(calls.del).toHaveLength(1);
      expect(calls.del[0][0]).toEqual([
        "https://store1abc.public.blob.vercel-storage.com/photos/client/a.webp",
        "https://store1abc.public.blob.vercel-storage.com/music/own/b.mp3",
      ]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(
        JSON.parse(
          String(
            (fetchMock.mock.calls[0] as unknown[])[1] &&
              ((fetchMock.mock.calls[0] as unknown[])[1] as RequestInit).body,
          ),
        ),
      ).toEqual({
        action: "remove",
        bucket: "photos",
        path: "client/c.webp",
      });
    } finally {
      log.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it("проверка наличия файла", async () => {
    expect(await blobExists("health", "ping.txt")).toBe(true);
    expect(await blobExists("health", "missing.txt")).toBe(false);
  });

  it("принимаем адреса только своего хранилища: наш Blob и наш старый Supabase", () => {
    vi.stubEnv("SUPABASE_URL", "https://ours.supabase.co");
    expect(isOurFileUrl("https://store1abc.public.blob.vercel-storage.com/music/own/a.mp3")).toBe(true);
    expect(isOurFileUrl("https://other999.public.blob.vercel-storage.com/music/own/a.mp3")).toBe(false);
    expect(isOurFileUrl("https://ours.supabase.co/storage/v1/object/public/photos/client/a.webp")).toBe(true);
    expect(isOurFileUrl("https://theirs.supabase.co/storage/v1/object/public/photos/client/a.webp")).toBe(false);
    expect(isOurFileUrl("https://evil.example/music/own/a.mp3")).toBe(false);
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    expect(isOurFileUrl("https://store1abc.public.blob.vercel-storage.com/music/own/a.mp3")).toBe(false);
  });
});
