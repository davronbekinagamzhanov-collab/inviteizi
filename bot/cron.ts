/**
 * Задания по расписанию (pg_cron → POST /api/cron каждые 10 минут):
 *  - админам: чек ждёт больше 30 минут — одно напоминание;
 *  - клиенту: пропал на оплате больше 3 часов — одно вежливое напоминание;
 *  - архив: прошёл expiresAt (последний тадбир + 30 дней) → archived (ссылка показывает заглушку).
 * Каждое напоминание — одна попытка: если пользователь заблокировал бота, повторять не будем.
 */
import type { Deps } from "./flow/types";
import { adminCard, decisionButtons } from "./flow/orders";
import { inline, pageUrl, price, txFor } from "./flow/util";
import { creditPartner } from "./flow/partners";

export type CronResult = { adminReminded: number; clientReminded: number; archived: number; errors: number };

const MIN = 60_000;
export const ADMIN_REMIND_AFTER_MIN = 30;
export const CLIENT_REMIND_AFTER_MIN = 3 * 60;

export async function runCron(deps: Deps): Promise<CronResult> {
  const { repo, tg } = deps;
  const now = deps.now();
  const r: CronResult = { adminReminded: 0, clientReminded: 0, archived: 0, errors: 0 };
  const ctx = { deps };

  // ── Админам: чек ждёт ──
  const waiting = await repo.ordersAwaitingAdmin(new Date(now.getTime() - ADMIN_REMIND_AFTER_MIN * MIN));
  if (waiting.length) {
    const admins = await repo.listAdminIds();
    for (const o of waiting) {
      const client = await repo.getUser(o.userId);
      const minutes = Math.round((now.getTime() - (o.receiptAt ?? now).getTime()) / MIN);
      for (const adminId of admins) {
        const lang = (await repo.getUser(adminId))?.lang ?? "uz";
        const tx = txFor(lang);
        try {
          await tg.sendMessage(adminId, `${tx.admin.remind(o.number, minutes)}\n\n${adminCard(deps, o, lang, client)}`, {
            markup: inline(decisionButtons(tx, o.number)),
          });
        } catch (e) {
          r.errors++;
          console.error("cron admin remind", e instanceof Error ? e.name : "Error");
        }
      }
      await repo.updateOrder(o.id, { adminRemindedAt: now });
      r.adminReminded++;
    }
  }

  // ── Клиенту: пропал на оплате ──
  for (const o of await repo.ordersAbandonedAtPayment(new Date(now.getTime() - CLIENT_REMIND_AFTER_MIN * MIN))) {
    const tx = txFor((await repo.getUser(o.userId))?.lang);
    try {
      await tg.sendMessage(o.userId, tx.pay.reminder(pageUrl(ctx, o.slug)), {
        markup: inline([[{ text: tx.order.pay(price(o.amount)), data: `pay:${o.number}` }]]),
      });
      r.clientReminded++;
    } catch (e) {
      r.errors++;
      console.error("cron client remind", e instanceof Error ? e.name : "Error");
    }
    await repo.updateOrder(o.id, { paymentRemindedAt: now });
  }

  // ── Архив ──
  for (const o of await repo.listOrdersByStatus(["active"])) {
    if (o.expiresAt && o.expiresAt <= now && (await repo.transition(o.id, ["active"], "archived"))) r.archived++;
  }

  // ── Партнёры: оплаты, которые не начислились сразу (сбой в момент подтверждения) ──
  try {
    for (const o of await repo.uncreditedPartnerOrders()) await creditPartner(deps, o);
  } catch (e) {
    r.errors++;
    console.error("cron partners", e instanceof Error ? e.name : "Error");
  }

  return r;
}
