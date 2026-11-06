/**
 * Режим страницы приглашения (full | demo | expired) — для уже открытой НАМУНА.
 * Вкладка Telegram/Safari может вернуть старую страницу из памяти (без запроса к серверу);
 * НАМУНА спрашивает здесь и перезагружается, как только заказ подтверждён.
 */
import { PgRepo } from "@/bot/repo-pg";
import { pageMode } from "@/lib/orders";

const NO_STORE = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug") ?? "";
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) return Response.json({ error: "bad" }, { status: 400, headers: NO_STORE });
  try {
    const order = await new PgRepo().getOrderBySlug(slug);
    if (!order) return Response.json({ error: "notFound" }, { status: 404, headers: NO_STORE });
    return Response.json({ mode: pageMode(order, new Date()) }, { headers: NO_STORE });
  } catch (e) {
    console.error("status", e instanceof Error ? e.name : "Error");
    return Response.json({ error: "server" }, { status: 503, headers: NO_STORE });
  }
}
