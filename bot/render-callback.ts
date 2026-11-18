/**
 * Ответ runner'а видео (GitHub Actions → POST /api/render): Authorization: Bearer RENDER_CALLBACK_SECRET.
 * Тело: { orderId, status: running|done|failed, url?, error? }. Адрес видео — только наш Vercel Blob (keepsake/…mp4).
 */
import { timingSafeEqual } from "node:crypto";
import { BLOB_URL } from "@/lib/storage";
import { videoResult } from "./keepsake";
import type { Deps } from "./flow/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function sameSecret(given: string | null, expected: string | undefined) {
  if (!expected || !given) return false;
  const a = Buffer.from(given),
    b = Buffer.from(`Bearer ${expected}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function handleRenderCallback(
  req: Request,
  secret: string | undefined,
  getDeps: () => Deps,
): Promise<Response> {
  if (!sameSecret(req.headers.get("authorization"), secret)) return Response.json({ ok: false }, { status: 401 });
  let body: { orderId?: unknown; status?: unknown; url?: unknown; error?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "json" }, { status: 400 });
  }
  const { orderId, status, url, error } = body;
  if (typeof orderId !== "string" || !UUID.test(orderId)) return Response.json({ ok: false }, { status: 400 });
  if (status !== "running" && status !== "done" && status !== "failed") return Response.json({ ok: false }, { status: 400 });
  if (status === "done" && (typeof url !== "string" || !BLOB_URL.test(url) || !/\/keepsake\/[^?#]+\.mp4$/.test(url)))
    return Response.json({ ok: false, error: "url" }, { status: 400 });
  const result = await videoResult(getDeps(), orderId, {
    status,
    url: typeof url === "string" ? url : undefined,
    error: typeof error === "string" ? error.slice(0, 300) : undefined,
  });
  return Response.json({ ok: result !== "notFound", result }, { status: result === "notFound" ? 404 : 200 });
}
