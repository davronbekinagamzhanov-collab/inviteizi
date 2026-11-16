import type { Ctx, Deps } from "./flow/types";
import { marketingCopy } from "@/texts/marketing";
import { MarketingError } from "./marketing-repo";
import { statusCaption, statusPoster } from "@/lib/marketing/status-poster";
import { inline, price, txFor, expiresAt } from "./flow/util";
import { isUnreachable } from "./errors";
import { sendLinkPack } from "./flow/orders";
async function sendReport(c: Ctx, text: string) {
  for (let i = 0; i < text.length; i += 3500) await c.deps.tg.sendMessage(c.chatId, text.slice(i, i + 3500));
}
const enabled = (d: Deps) => !!d.env.marketing?.delivery && !!d.repo.marketing;
/** Persisted jobs, bounded retries. Financial effects were committed before any Telegram request. */
export async function withMarketingReady(deps: Deps): Promise<Deps> {
  if (!deps.env.marketing?.delivery) return deps;
  if (deps.repo.marketing && (await deps.repo.marketing.ready())) return deps;
  return {
    ...deps,
    env: {
      ...deps.env,
      marketing: {
        ...deps.env.marketing,
        delivery: false,
        referrals: false,
        promos: false,
        status: false,
        edits: false,
      },
    },
  };
}
export async function flushMarketing(deps: Deps) {
  if (!enabled(deps)) return 0;
  const store = deps.repo.marketing!,
    now = deps.now();
  let sent = 0;
  const started = Date.now();
  for (let pass = 0; pass < 2; pass++)
    for (const job of await store.claimJobs(deps.now(), 5)) {
      if (Date.now() - started > 12000) {
        await store.deferJob(job, deps.now());
        continue;
      }
      try {
        let messageId: number | undefined;
        if (!job.body.kind) {
          const message = await deps.tg.sendMessage(
            job.chatId,
            job.body.text,
            job.body.markup
              ? {
                  markup: job.body.markup as {
                    inline: import("./tg").InlineButton[][];
                  },
                }
              : undefined,
          );
          messageId = message.messageId;
        } else {
          const order = job.body.orderId ? await deps.repo.getOrder(job.body.orderId) : null;
          if (!order || order.status !== "active" || (order.expiresAt && order.expiresAt <= now)) {
            await store.failJob(job, now, "order_inactive", true);
            continue;
          }
          const lang = (await deps.repo.getUser(order.userId))?.lang === "ru" ? "ru" : "uz",
            tx = marketingCopy(lang),
            url = deps.env.publicBaseUrl + "/" + order.slug;
          if (job.body.kind === "paid_pack") {
            if ((await store.issuance(order.id))?.marketing_issued_at) {
              await store.ackJob(job, deps.now());
              continue;
            }
            const result = await sendLinkPack(
              deps,
              order,
              true,
              (await store.issuance(order.id))?.marketing_payment_kind === "promotion",
            );
            messageId = result.messageId;
            if (!result.linkSent) throw new Error("link_delivery_failed");
          } else {
            if (!(await store.issuance(order.id))?.marketing_issued_at) {
              await store.failJob(job, now, "awaiting_link");
              continue;
            }
            if (job.body.kind === "status" && deps.env.marketing?.status) {
              const bytes = await statusPoster(order, url);
              if (!(await store.markSending(job, deps.now()))) continue;
              const m = await deps.tg.sendPhoto(order.userId, bytes, { caption: statusCaption(order, url, tx.status) });
              messageId = m.messageId;
            }
            if (job.body.kind === "referral") {
              const own = deps.env.marketing?.referrals ? await store.referralStats(order.userId) : null,
                lines: string[] = [];
              const rows: import("./tg").InlineButton[][] = [];
              if (own) {
                const link = `https://t.me/${await deps.tg.botUsername()}?start=p_${own.code}`;
                lines.push(`${tx.referral} ${price(own.rate)}.`, link);
                rows.push(
                  [
                    { text: tx.copy, copy: link },
                    { text: tx.share, url: `https://t.me/share/url?url=${encodeURIComponent(link)}` },
                  ],
                  [{ text: tx.stats, data: "mk:stats" }],
                );
              }
              if (deps.env.marketing?.edits) lines.push(tx.correction, tx.editRule);
              if (lines.length) {
                const m = await deps.tg.sendMessage(order.userId, lines.join("\n\n"), { markup: inline(rows) });
                messageId = m.messageId;
              }
            }
          }
        }
        await store.ackJob(job, deps.now(), messageId);
        sent++;
      } catch (e) {
        const unreachable = isUnreachable(e),
          name = e instanceof Error ? e.name : "";
        await store
          .failJob(
            job,
            deps.now(),
            unreachable
              ? "recipient_unreachable"
              : name === "AbortError" || name === "TimeoutError" || name === "HttpError"
                ? "telegram_timeout"
                : "delivery_error",
            unreachable || name === "AbortError" || name === "TimeoutError" || name === "HttpError",
          )
          .catch(() => {});
      }
    }
  return sent;
}
export async function marketingCommand(c: Ctx): Promise<boolean> {
  const u = c.u,
    flags = c.deps.env.marketing,
    store = c.deps.repo.marketing;
  const isStats = u.kind === "callback" && u.data === "mk:stats";
  const command = u.kind === "command" ? u.command : "";
  if (
    !isStats &&
    ![
      "referrals",
      "promo",
      "promo_create",
      "promo_disable",
      "promos",
      "correction",
      "corrections",
      "correction_done",
      "correction_apply",
      "correction_reject",
      "refund",
      "delivery",
      "delivery_retry",
    ].includes(command)
  )
    return false;
  if (c.chatId !== c.user.id) return true;
  const t = marketingCopy(c.lang);
  if (!flags?.delivery || !store) {
    await c.deps.tg.sendMessage(c.chatId, t.disabled);
    return true;
  }
  if (!(await store.allowCommand(c.user.id, c.deps.now()))) {
    await c.deps.tg.sendMessage(c.chatId, t.rateLimit);
    return true;
  }
  const a = u.kind === "command" ? u.args.trim().split(/\s+/) : [];
  try {
    if (command === "referrals" || isStats) {
      if (!flags.referrals) throw new MarketingError("disabled");
      const r = await store.referralStats(c.user.id);
      await c.deps.tg.sendMessage(
        c.chatId,
        r
          ? `${t.stats}\n${t.friends}: ${r.friends}\n${t.earned}: ${price(r.earned)}\n${t.paid}: ${price(r.paid)}\n${t.due}: ${price(Math.max(0, r.due))}${r.due < 0 ? "\n" + (c.lang === "ru" ? "Корректировка будущих выплат: " : "Кейинги тўлов тузатиши: ") + price(-r.due) : ""}`
          : t.disabled,
      );
      if (r) {
        const link = `https://t.me/${await c.deps.tg.botUsername()}?start=p_${r.code}`;
        await c.deps.tg.sendMessage(c.chatId, link, {
          markup: inline([
            [
              { text: t.copy, copy: link },
              { text: t.share, url: `https://t.me/share/url?url=${encodeURIComponent(link)}` },
            ],
          ]),
        });
      }
    } else if (command === "promo_create") {
      if (!flags.promos) throw new MarketingError("disabled");
      const expiry = a[3] && a[3] !== "-" ? new Date(a[3] + "T23:59:59+05:00") : null;
      await store.createPromo(c.user.id, a[0] ?? "", Number(a[1]), Number(a[2]), expiry, a.slice(4).join(" ") || a[0]);
      await c.deps.tg.sendMessage(c.chatId, t.done);
    } else if (command === "promo_disable") {
      if (!flags.promos) throw new MarketingError("disabled");
      await store.disablePromo(c.user.id, a[0] ?? "");
      await c.deps.tg.sendMessage(c.chatId, t.done);
    } else if (command === "promos") {
      await sendReport(c, JSON.stringify(await store.promoStats(c.user.id), null, 2));
    } else if (command === "promo") {
      if (!flags.promos) throw new MarketingError("disabled");
      const order = await c.deps.repo.getOrderByNumber(Number(a[0]));
      if (!order || order.userId !== c.user.id) throw new MarketingError("order_missing");
      const r = await store.reservePromo(c.user.id, order.id, a[1] ?? "", c.deps.now());
      const tx = txFor(c.lang);
      await c.deps.tg.sendMessage(c.chatId, `${t.promo}\n${price(r.amount)}`, {
        markup: inline([
          [{ text: r.amount === 0 ? t.freeAction : tx.order.pay(price(r.amount)), data: `pay:${order.number}` }],
        ]),
      });
    } else if (command === "correction") {
      if (!flags.edits) throw new MarketingError("disabled");
      const order = await c.deps.repo.getOrderByNumber(Number(a[0]));
      if (!order || order.userId !== c.user.id) throw new MarketingError("order_missing");
      const r = await store.requestEdit(
        c.user.id,
        order.id,
        `update:${c.user.id}:${u.updateId ?? (u.kind === "command" ? u.messageId : 0)}`,
        a.slice(1).join(" "),
        c.deps.now(),
      );
      await flushMarketing(c.deps);
      await c.deps.tg.sendMessage(
        c.chatId,
        `${t.editSent}\n${r.fee === 0 ? t.editFree : t.editPaid + " · " + price(r.fee)}`,
      );
    } else if (command === "corrections") {
      const rows = await store.pendingEdits(c.user.id);
      await sendReport(
        c,
        rows
          .map((r) => `${r.id} · #${r.number} · ${r.fee === 0 ? "БЕСПЛАТНАЯ" : "ПЛАТНАЯ · " + r.fee + " ₸"}\n${r.body}`)
          .join("\n\n") || "—",
      );
    } else if (command === "correction_apply") {
      await store.applyDateEdit(
        c.user.id,
        a[0] ?? "",
        a[1] ?? "",
        a[2] ?? "",
        Number(a[3] ?? 1) - 1,
        c.deps.now(),
        a[4] === "paid",
      );
      await c.deps.tg.sendMessage(c.chatId, t.done);
    } else if (command === "correction_done" || command === "correction_reject") {
      await store.decideEdit(c.user.id, a[0] ?? "", command === "correction_done", c.deps.now());
      await c.deps.tg.sendMessage(c.chatId, t.done);
    } else if (command === "refund") {
      const order = await c.deps.repo.getOrderByNumber(Number(a[0]));
      if (!order) throw new MarketingError("order_missing");
      await store.refund(c.user.id, order.id, a.slice(1).join(" "), c.deps.now());
      await c.deps.tg.sendMessage(c.chatId, t.refund);
    } else if (command === "delivery") {
      await sendReport(c, JSON.stringify(await store.deliveryProblems(c.user.id), null, 2));
    } else if (command === "delivery_retry") {
      await store.retryDelivery(c.user.id, a[0] ?? "", c.deps.now());
      await flushMarketing(c.deps);
    }
  } catch (e) {
    if (!(e instanceof MarketingError)) throw e;
    await c.deps.tg.sendMessage(c.chatId, e instanceof MarketingError && e.code === "disabled" ? t.disabled : t.error);
  }
  return true;
}
export async function fulfillPromotion(c: Ctx, order: import("@/lib/domain").OrderRecord) {
  if (!c.deps.env.marketing?.promos || !c.deps.repo.marketing) throw new MarketingError("disabled");
  const result = await c.deps.repo.marketing.confirm(
    order.id,
    c.user.id,
    c.deps.now(),
    c.deps.env.publicBaseUrl,
    "promotion",
    expiresAt(order.data),
    c.deps.env.marketing,
  );
  if (result) await flushMarketing(c.deps);
  return result;
}
