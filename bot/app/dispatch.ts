/**
 * Действия Mini App: одно действие на запрос. Вынесено из app/api/app/route.ts (17.11.2026), чтобы
 * браузерная проверка ролей гоняла тот же серверный код на тестовой базе. Пользователь — уже проверенный initData.
 */
import { payByName } from "../flow/pay-name";
import { allow, LIMITS } from "@/lib/rate-limit";
import type { AppUser } from "@/lib/tg-init-data";
import type { Lang } from "@/lib/domain";
import type { Deps } from "../flow/types";
import * as app from "./service";
import { partnerPoster, rolePanel } from "./roles-panel";
import { ownerExport, ownerPanel } from "./owner";
import { ownerAct } from "./owner-actions";
import { isOwnerAdminAction, ownerAdmin, ownerAdminStatus } from "./owner-admin";

export type AppReply = { status: number; body: unknown };
const res = (body: unknown, status = 200): AppReply => ({ status, body });
const ok = (body: unknown) => res(body);

export async function appAction(
  deps: Deps,
  user: AppUser,
  body: { action?: string; [k: string]: unknown },
): Promise<AppReply> {
  switch (body.action) {
    case "session":
      return ok(await app.openSession(deps, user));
    case "lang":
      return ok(await app.setLang(deps, user, body.lang));
    case "favorite":
      return ok(await app.toggleFavorite(deps, user, body.templateId, body.saved));
    case "music":
      return ok(await app.musicFor(deps, body.templateId, (body.lang === "ru" ? "ru" : "uz") as Lang));
    case "draft":
      return ok(await app.saveDraft(deps, user, body.draft as app.AppDraft));
    case "submit":
      return ok(await app.submitDraft(deps, user, body.draft as app.AppDraft));
    case "edit":
      return ok(await app.editOrder(deps, user, body.orderId));
    case "new":
      return ok(await app.newDraft(deps, user));
    // Переход к оплате: цена фиксируется (акция / промокод / оптовая)
    case "quote":
      return ok(await app.quoteOrder(deps, user, body.orderId));
    case "promo":
      return ok(await app.promoForOrder(deps, user, body.orderId, body.code));
    case "confirmPay":
      return ok(await app.confirmPay(deps, user, body.orderId, body.terms));
    // Оплата без чека: «✅ Тўладим» + имя, как в Kaspi
    case "paidByName": {
      const r = await payByName(deps, user.id, typeof body.orderId === "string" ? body.orderId : "", body.name);
      return "error" in r ? res(r, r.error === "tooOften" ? 429 : 200) : ok({ ok: true, night: r.night });
    }
    case "orders":
      return ok(await app.listOrders(deps, user));
    case "musicUpload": {
      if (!allow(`music:${user.id}`, LIMITS.musicUpload)) return res({ error: "tooOften" }, 429);
      const r = await app.musicUpload(deps, body.ext, body.size);
      return res(r, "error" in r ? (r.error === "server" ? 500 : 400) : 200);
    }
    // Владелец: приглашение без оплаты с причиной; клиенту — 403
    case "freeIssue": {
      const r = await app.staffFreeIssue(deps, user, body.orderId, body.reason);
      return "error" in r ? res(r, r.error === "forbidden" ? 403 : 400) : res(r);
    }
    case "cancel":
      return ok(await app.cancelOrder(deps, user, body.orderId));
    // Панель владельца: только ADMIN_IDS, остальным 403
    case "owner": {
      const r = await ownerPanel(deps, user.id, body.period);
      return "error" in r ? res(r, 403) : res(r);
    }
    // Панель менеджера/партнёра: роль по initData, остальным 403
    case "rolePanel": {
      const r = await rolePanel(deps, user, body.period);
      return "error" in r ? res(r, 403) : res(r);
    }
    case "partnerPoster": {
      const r = await partnerPoster(deps, user, body.lang);
      return "error" in r ? res(r, r.error === "tooOften" ? 429 : 403) : res(r);
    }
    // Действия владельца из админки — тем же кодом, что кнопки бота (белый список)
    case "ownerAct": {
      const r = await ownerAct(deps, user, body.act);
      return "error" in r ? res(r, r.error === "forbidden" ? 403 : 400) : res(r);
    }
    case "ownerExport": {
      const r = await ownerExport(deps, user.id, body.period);
      return "error" in r ? res(r, 403) : res(r);
    }
    default: {
      // Админка владельца (партнёры, менеджеры, выплаты, промокоды, заказ для клиента): не админу — 403
      if (isOwnerAdminAction(body.action)) {
        const r = await ownerAdmin(deps, user, body.action, body);
        return "error" in r ? res(r, ownerAdminStatus(r.error)) : res(r);
      }
      return res({ error: "bad" }, 400);
    }
  }
}
