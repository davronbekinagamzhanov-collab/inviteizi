/** Файлы из приложения: фото клиента (kind=photo) и чек (kind=receipt&order=<id>). Лимит тела Vercel ~4,5 МБ — фото сжимает телефон */
import { createBotDeps } from "@/bot/deps";
import { appGate, json } from "@/lib/app-auth";
import { submitReceipt } from "@/bot/app/service";
import { PhotoFormatError, PHOTO_MAX_BYTES } from "@/bot/own-photo";

export const maxDuration = 60;

export async function POST(req: Request) {
  // Preview must never write through inherited live credentials. Native fixture tests cover mutations.
  if(process.env.VERCEL_ENV==="preview")return new Response(null,{status:404});
  const user = appGate(req);
  if (user instanceof Response) return user;
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind");
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > PHOTO_MAX_BYTES + 64_000) return json({ error: "tooBig" }, 413);
  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    file = f instanceof File ? f : null;
  } catch {
    return json({ error: "format" }, 400);
  }
  if (!file || !file.size) return json({ error: "format" }, 400);
  if (file.size > PHOTO_MAX_BYTES) return json({ error: "tooBig" }, 413);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const deps = createBotDeps();
  try {
    if (kind === "photo") {
      if (!deps.savePhotoBytes) return json({ error: "server" }, 500);
      return json({ url: await deps.savePhotoBytes(bytes) });
    }
    if (kind === "receipt") {
      return json(await submitReceipt(deps, user, url.searchParams.get("order"), { bytes, mime: file.type, name: file.name }));
    }
    return json({ error: "bad" }, 400);
  } catch (e) {
    if (e instanceof PhotoFormatError) return json({ error: "format" }, 400);
    console.error("api/app/upload", kind, e instanceof Error ? e.name : "Error");
    return json({ error: "server" }, 500);
  }
}
