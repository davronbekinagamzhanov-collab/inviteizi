/**
 * Действующая акция для веб-каталога /catalog (посетитель без аккаунта = обычный клиент).
 * Только витринные поля: название, скидка, окончание, тадбиры, форматы. Кэш — минута.
 */
import { PgRepo } from "@/bot/repo-pg";
import { promotionView, runningPromotion } from "@/bot/pricing";

const CACHE = { "Cache-Control": "public, max-age=60, s-maxage=60" };

export async function GET() {
  try {
    const p = await runningPromotion({ repo: new PgRepo() }, new Date());
    return Response.json({ promotion: p ? promotionView(p) : null }, { headers: CACHE });
  } catch (e) {
    console.error("promotion", e instanceof Error ? e.name : "Error");
    return Response.json({ promotion: null }, { headers: CACHE });
  }
}
