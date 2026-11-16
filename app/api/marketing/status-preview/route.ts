/** Synthetic design sample only. No order lookup, DB, customer photograph or Telegram access. */
import { connection } from "next/server";
import { getDesign, isOnSale } from "@/templates/registry";
import { futureDemoData } from "@/lib/marketing/demo-dates";
import { statusPoster } from "@/lib/marketing/status-poster";
import type { OrderRecord } from "@/lib/domain";
export async function GET(req: Request) {
  await connection();
  if (
    process.env.VERCEL_ENV === "production" ||
    (process.env.NODE_ENV === "production" && process.env.VERCEL_ENV !== "preview")
  )
    return new Response(null, { status: 404 });
  const q = new URL(req.url),
    id = q.searchParams.get("template") ?? "muhr",
    design = getDesign(id);
  if (!design || !isOnSale(id)) return new Response(null, { status: 404 });
  const origin = q.origin,
    data = futureDemoData(design.sample, new Date()),
    order = { templateId: id, occasion: design.occasion, data, slug: "demo/" + id } as OrderRecord;
  return new Response(
    await statusPoster(
      order,
      origin + "/demo/" + id,
      q.searchParams.get("lang") === "ru" ? "ru" : q.searchParams.get("lang") === "kk" ? "kk" : "uz",
    ),
    { headers: { "content-type": "image/png", "cache-control": "private,no-store" } },
  );
}
