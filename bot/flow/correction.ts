import type { Ctx, Result, Step } from "./types";
import { marketingCopy } from "@/texts/marketing";
import { MarketingError } from "../marketing-repo";
import { flushMarketing } from "../marketing";
import { inline, send } from "./util";
export async function beginCorrection(c: Ctx, number: number): Promise<Result> {
  const t = marketingCopy(c.lang);
  if (c.chatId !== c.user.id || !c.deps.env.marketing?.edits || !c.deps.repo.marketing) {
    await send(c, t.disabled);
    return null;
  }
  const o = await c.deps.repo.getOrderByNumber(number);
  if (!o || o.userId !== c.user.id || o.status !== "active") {
    await send(c, t.error);
    return null;
  }
  c.s.correctionOrder = o.id;
  return { to: "correction" };
}
export const correctionStep: Step = {
  async ask(c) {
    await send(c, marketingCopy(c.lang).editPrompt, inline([]));
  },
  async onMessage(c) {
    const t = marketingCopy(c.lang),
      u = c.u;
    if (u.kind !== "text" || !u.text.trim() || u.text.length > 600) return { hint: t.editPrompt };
    if (!c.deps.env.marketing?.edits || !c.deps.repo.marketing || !c.s.correctionOrder) return { hint: t.disabled };
    try {
      const r = await c.deps.repo.marketing.requestEdit(
        c.user.id,
        c.s.correctionOrder,
        `message:${c.user.id}:${u.updateId ?? u.messageId}`,
        u.text,
        c.deps.now(),
      );
      await flushMarketing(c.deps);
      await send(c, `${t.editSent}\n${r.fee === 0 ? t.editFree : t.editPaid + " · 2 000 ₸"}`);
      return { done: true };
    } catch (e) {
      if (e instanceof MarketingError) return { hint: t.error };
      throw e;
    }
  },
};
