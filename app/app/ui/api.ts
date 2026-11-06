"use client";
/** Запросы приложения: в каждом — initData (сервер проверяет подпись). Фото сжимает телефон до отправки */
import { initDataOf } from "./telegram";

export class ApiError extends Error {
  constructor(public code: string, public status = 0) {
    super(code);
  }
}

const initData = initDataOf;
/** Запрос не висит вечно: 25 с — и честная ошибка с «Қайта уриниш» */
const TIMEOUT_MS = 25_000;

export async function api<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  let res: Response;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    res = await fetch("/api/app", {
      method: "POST",
      headers: { "content-type": "application/json", "x-tg-init-data": initData() },
      body: JSON.stringify({ action, ...body }),
      cache: "no-store",
      signal: ctrl.signal,
    });
  } catch {
    throw new ApiError("offline");
  } finally {
    clearTimeout(timer);
  }
  const data = (await res.json().catch(() => ({ error: "server" }))) as T & { error?: string };
  if (res.status === 401) throw new ApiError("auth", 401);
  if (!res.ok && data.error) throw new ApiError(data.error, res.status);
  return data;
}

/** Загрузка файла с прогрессом (0–1). kind=photo → {url}; kind=receipt → результат чека */
export function upload<T>(kind: "photo" | "receipt", file: Blob, name: string, params: Record<string, string>, onProgress?: (p: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const q = new URLSearchParams({ kind, ...params });
    xhr.open("POST", `/api/app/upload?${q}`);
    xhr.setRequestHeader("x-tg-init-data", initData());
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onerror = () => reject(new ApiError("offline"));
    xhr.onload = () => {
      let data: T & { error?: string };
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        return reject(new ApiError("server", xhr.status));
      }
      if (xhr.status === 401) return reject(new ApiError("auth", 401));
      if (xhr.status >= 400 && data.error) return reject(new ApiError(data.error, xhr.status));
      resolve(data);
    };
    const form = new FormData();
    form.append("file", file, name);
    xhr.send(form);
  });
}

export const MAX_FILE = 10 * 1024 * 1024;
/** Тело запроса Vercel ≤ 4,5 МБ: всё, что телефон может разобрать, ужимаем до 1600 px JPEG */
const MAX_RAW_UPLOAD = 4.3 * 1024 * 1024;
const MAX_SIDE = 1600;

/** Картинка → JPEG до 1600 px. HEIC, который браузер не умеет открыть, уходит как есть (сервер разберёт), если влезает */
export async function shrinkImage(file: File): Promise<{ blob: Blob; name: string }> {
  if (file.size > MAX_FILE) throw new ApiError("tooBig");
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.86));
    if (blob) return { blob, name: "photo.jpg" };
  } catch {
    // не смогли открыть — попробуем отправить как есть
  }
  if (file.size > MAX_RAW_UPLOAD) throw new ApiError("tooBig");
  return { blob: file, name: file.name || "photo" };
}
