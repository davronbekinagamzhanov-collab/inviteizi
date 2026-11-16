/**
 * Админка владельца в Mini App (17.11.2026): партнёры, менеджеры, выплаты, промокоды, заказ для клиента.
 * Каждый запрос сначала проверяет права на сервере по initData (repo.isAdmin) — клиенту, менеджеру и партнёру 403.
 * Логика та же, что у кнопок бота (общие функции ссылок, ставок и выплат), отдельной бизнес-логики здесь нет.
 */
import { audience, broadcastMessage, runBroadcast, startBroadcast } from "../broadcast";
import type { AppUser } from "@/lib/tg-init-data";
import { partnerRowsWithin, SCHEDULES, type Partner, type PayoutSchedule } from "@/lib/owner-panel";
import { managerName } from "@/lib/roles";
import { MarketingError } from "../marketing-repo";
import { fmtPhone, panelData, parseRate, partnerJoinLink, newPartnerCode, normalizePhone } from "../flow/partners";
import { clientOrderShare, managerInviteLink } from "../flow/panel";
import { afterPartnerPayout } from "../flow/notify";
import { syncMenuButton } from "../flow/menu-button";
import { designName, PAYABLE_STATUSES, texts } from "../flow/util";
import type { Deps } from "../flow/types";
import type { Occasion } from "@/lib/types";
import { FORMATS, type Format } from "@/templates/registry";

/** Все действия админки. Имя действия API = ключ */
export const OWNER_ADMIN_ACTIONS = [
  "ownerPartners",
  "ownerPartnerNew",
  "ownerPartnerLink",
  "ownerPartnerTerms",
  "ownerPartnerPause",
  "ownerManagers",
  "ownerManagerInvite",
  "ownerManagerRemove",
  "ownerPayouts",
  "ownerPayoutMark",
  "ownerPromos",
  "ownerPromoCreate",
  "ownerPromoDisable",
  "ownerClientOrders",
  "ownerClientLink",
  "ownerPromotions",
  "ownerPromotionCreate",
  "ownerPromotionStop",
  "ownerWholesalers",
  "ownerWholesaleSet",
  "ownerWholesaleRemove",
  "ownerBroadcastPreview",
  "ownerBroadcastStart",
] as const;
export type OwnerAdminAction = (typeof OWNER_ADMIN_ACTIONS)[number];
export const isOwnerAdminAction = (a: unknown): a is OwnerAdminAction =>
  typeof a === "string" && (OWNER_ADMIN_ACTIONS as readonly string[]).includes(a);

type Fail = { error: "forbidden" | "bad" | "notFound" | "stale" | "disabled" | "exists"; reason?: string };
/** HTTP-код ошибки админки: чужой роли — всегда 403 */
export const ownerAdminStatus = (e: Fail["error"]) =>
  ({ forbidden: 403, notFound: 404, stale: 409, exists: 409, disabled: 503, bad: 400 })[e];
const bad = (): Fail => ({ error: "bad" });
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const int = (v: unknown) => (typeof v === "number" && Number.isSafeInteger(v) ? v : NaN);
const isSchedule = (v: unknown): v is PayoutSchedule => (SCHEDULES as unknown[]).includes(v);

export type AdminPartner = {
  id: number;
  name: string;
  phone: string | null;
  status: "pending" | "active" | "rejected";
  /** Приостановлен: ставка 0 (начислений нет, переходы считаются) */
  paused: boolean;
  rate: number;
  ratePercent: number | null;
  schedule: PayoutSchedule;
  joined: boolean;
  manager: string | null;
  sales: number;
  earned: number;
  paidOut: number;
  due: number;
  onHold: number;
};

async function partners(deps: Deps) {
  const s = await panelData(deps);
  const managers = await deps.repo.listManagers();
  const rows = partnerRowsWithin(s, () => true);
  const list: AdminPartner[] = rows
    // «Покупатель #…» — реферальная программа клиентов (PR #20): у них свой экран, в выплатах они есть
    .filter((r) => !r.partner.customerUserId)
    .map(({ partner: p, paid, earned, paidOut, due, onHold }) => {
      const m = p.managedBy ? managers.find((x) => x.telegramId === p.managedBy) : null;
      return {
        id: p.id,
        name: p.name,
        phone: p.phone ? fmtPhone(p.phone) : null,
        status: p.status,
        paused: p.rate === 0 && (p.ratePercent ?? 0) === 0,
        rate: p.rate,
        ratePercent: p.ratePercent ?? null,
        schedule: p.schedule,
        joined: p.telegramId != null,
        manager: m ? managerName(m) : null,
        sales: paid,
        earned,
        paidOut,
        due,
        onHold,
      };
    })
    .sort((a, b) => b.due - a.due || b.sales - a.sales || a.id - b.id);
  return { ready: s.partnersReady, partners: list };
}

/** Кому сколько к выплате (только подтверждённые партнёры) и история выплат */
async function payouts(deps: Deps) {
  const s = await panelData(deps);
  const rows = partnerRowsWithin(s, () => true);
  const byId = new Map(s.partners.map((p) => [p.id, p]));
  const version = (id: number) => s.payouts.filter((x) => x.partnerId === id).length;
  return {
    due: rows
      .filter((r) => r.due > 0)
      .sort((a, b) => b.due - a.due)
      .map((r) => ({
        id: r.partner.id,
        name: r.partner.name,
        amount: r.due,
        kaspi: r.partner.kaspi,
        phone: r.partner.phone ? fmtPhone(r.partner.phone) : null,
        version: version(r.partner.id),
      })),
    history: [...s.payouts]
      .sort((a, b) => +b.createdAt - +a.createdAt)
      .slice(0, 50)
      .map((x) => ({
        name: byId.get(x.partnerId)?.name ?? `#${x.partnerId}`,
        amount: x.amount,
        at: x.createdAt.toISOString(),
      })),
  };
}

const OCCASIONS: Occasion[] = ["nikoh", "nahorgi", "sunnat", "yubiley"];
/** «2026-11-20T18:00» (время Алматы, как в форме) → дата */
function almaty(v: unknown) {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  const d = new Date(`${v}:00+05:00`);
  return Number.isFinite(+d) ? d : null;
}
/** null — «все»; false — неверное значение */
function pickList<T extends string>(v: unknown, all: readonly T[]): T[] | null | false {
  if (v === null || v === undefined) return null;
  if (!Array.isArray(v) || !v.length || !v.every((x) => (all as readonly unknown[]).includes(x))) return false;
  const set = [...new Set(v as T[])];
  return set.length === all.length ? null : set;
}

export type AdminPromotion = {
  id: string;
  name: string;
  percent: number;
  startsAt: string;
  endsAt: string;
  occasions: Occasion[] | null;
  formats: Format[] | null;
  forPartnerClients: boolean;
  state: "running" | "planned" | "ended" | "stopped";
  orders: number;
  sum: number;
  free: number;
  /** Рассылка клиентам: включена ли, когда ушла, напоминание; прогресс отправки */
  broadcast: boolean;
  remind: boolean;
  broadcastAt: string | null;
  remindAt: string | null;
  progress: { queued: number; sent: number; blocked: number; failed: number };
};

/** Акции с итогами: сколько оплаченных/выданных заказов и на какую сумму */
async function promotions(deps: Deps) {
  const now = deps.now();
  const staff = new Set(await deps.repo.staffIds());
  const orders = (await deps.repo.listOrdersByStatus(["active", "archived"])).filter((o) => !staff.has(o.userId));
  const all = await deps.repo.listPromotions();
  const stats = new Map(
    await Promise.all(all.map(async (p) => [p.id, await deps.repo.broadcastStats(`promo:${p.id}:`)] as const)),
  );
  const list: AdminPromotion[] = all.map((p) => {
    const mine = orders.filter((o) => o.pricing?.promotionId === p.id);
    return {
      id: p.id,
      name: p.name,
      percent: p.percent,
      startsAt: p.startsAt.toISOString(),
      endsAt: p.endsAt.toISOString(),
      occasions: p.occasions,
      formats: p.formats,
      forPartnerClients: p.forPartnerClients,
      state: p.stoppedAt ? "stopped" : +now < +p.startsAt ? "planned" : +now >= +p.endsAt ? "ended" : "running",
      orders: mine.length,
      sum: mine.reduce((n, o) => n + o.amount, 0),
      free: mine.filter((o) => o.amount === 0).length,
      broadcast: p.broadcast !== false,
      remind: p.remind !== false,
      broadcastAt: p.broadcastAt?.toISOString() ?? null,
      remindAt: p.remindAt?.toISOString() ?? null,
      progress: stats.get(p.id) ?? { queued: 0, sent: 0, blocked: 0, failed: 0 },
    };
  });
  return { promotions: list };
}

async function editablePartner(deps: Deps, id: number): Promise<Partner | null> {
  if (!Number.isSafeInteger(id)) return null;
  const p = await deps.repo.getPartner(id);
  return p && p.status !== "rejected" && !p.customerUserId ? p : null;
}

const promoError = (e: unknown): Fail => {
  if (!(e instanceof MarketingError)) throw e;
  return e.code === "promo_exists" ? { error: "exists" } : e.code === "forbidden" ? { error: "forbidden" } : bad();
};

export async function ownerAdmin(deps: Deps, u: AppUser, action: OwnerAdminAction, body: Record<string, unknown>) {
  // Права — только по initData на сервере, до любого чтения
  if (!(await deps.repo.isAdmin(u.id))) return { error: "forbidden" } as Fail;
  switch (action) {
    case "ownerPartners":
      return partners(deps);

    case "ownerPartnerNew": {
      // Только ссылка join_: партнёр сам открывает её в Telegram (по @username не создаём — риск чужого аккаунта)
      const name = str(body.name, 60);
      const phone = normalizePhone(str(body.phone, 30));
      const rate = parseRate(str(body.rate, 20));
      if (name.length < 2 || !phone || !rate || !isSchedule(body.schedule)) return bad();
      const p = await deps.repo.createPartner({
        code: newPartnerCode(),
        name,
        telegramId: null,
        username: null,
        rate: rate.rate,
        ratePercent: rate.pct,
        phone,
        schedule: body.schedule,
        status: "active",
        managedBy: null,
        ownerNotifiedAt: deps.now(),
      });
      return { ok: true as const, id: p.id, ...(await partnerJoinLink(deps, u.id, p)) };
    }

    case "ownerPartnerLink": {
      const p = await editablePartner(deps, int(body.id));
      if (!p) return { error: "notFound" } as Fail;
      if (p.telegramId != null) return bad();
      return { ok: true as const, ...(await partnerJoinLink(deps, u.id, p)) };
    }

    case "ownerPartnerTerms": {
      const p = await editablePartner(deps, int(body.id));
      if (!p) return { error: "notFound" } as Fail;
      const rate = parseRate(str(body.rate, 20));
      if (!rate || !isSchedule(body.schedule)) return bad();
      // Только для новых заказов: прошлые начисления записаны суммой в момент оплаты
      await deps.repo.setPartnerRate(p.id, rate.rate, rate.pct);
      await deps.repo.updatePartner(p.id, { schedule: body.schedule });
      return { ok: true as const };
    }

    case "ownerPartnerPause": {
      // Приостановить = ставка 0: ссылка и счёт переходов работают, новых начислений нет. Вернуть — новой ставкой
      const p = await editablePartner(deps, int(body.id));
      if (!p) return { error: "notFound" } as Fail;
      await deps.repo.setPartnerRate(p.id, 0, null);
      return { ok: true as const };
    }

    case "ownerManagers": {
      const s = await panelData(deps);
      const list = await deps.repo.listManagers();
      return {
        managers: list
          .filter((m) => m.active)
          .map((m) => ({
            id: m.telegramId,
            name: managerName(m),
            since: m.createdAt.toISOString(),
            partners: s.partners.filter((p) => p.managedBy === m.telegramId && p.status !== "rejected").length,
          })),
      };
    }

    case "ownerManagerInvite":
      return { ok: true as const, link: await managerInviteLink(deps, u.id) };

    case "ownerManagerRemove": {
      const id = int(body.id);
      if (!Number.isSafeInteger(id) || !(await deps.repo.removeManager(id, deps.now())))
        return { error: "notFound" } as Fail;
      // Снятому менеджеру — обычная клиентская кнопка меню вместо панели
      const lang = (await deps.repo.getUser(id))?.lang ?? "uz";
      await syncMenuButton(deps, id, "client", texts[lang].menuButton);
      return { ok: true as const };
    }

    case "ownerPayouts":
      return payouts(deps);

    case "ownerPayoutMark": {
      // Та же защита, что у кнопки бота: сумма и число прошлых выплат должны совпасть (двойное нажатие — «устарело»)
      const p = await deps.repo.getPartner(int(body.id));
      const amount = int(body.amount);
      if (!p || !(amount > 0)) return bad();
      const now = await payouts(deps);
      const row = now.due.find((x) => x.id === p.id);
      if (!row || row.amount !== amount || row.version !== int(body.version)) return { error: "stale" } as Fail;
      if (!(await deps.repo.recordPartnerPayout(p.id, amount, u.id))) return { error: "stale" } as Fail;
      await afterPartnerPayout(deps, p, amount);
      return { ok: true as const };
    }

    case "ownerPromos": {
      const store = deps.repo.marketing;
      if (!store) return { ready: false, enabled: false, promos: [] };
      const rows = await store.promoStats(u.id, 50);
      return {
        ready: true,
        // Создавать можно заранее; клиенты вводят код только при включённом MARKETING_PROMOS_ENABLED
        enabled: Boolean(deps.env.marketing?.promos),
        promos: rows.map((r) => ({
          code: String(r.code),
          name: String(r.name ?? ""),
          percent: Number(r.discount_percent),
          limit: Number(r.usage_limit),
          used: Number(r.used),
          reserved: Number(r.reserved),
          enabled: Boolean(r.enabled),
          expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : null,
        })),
      };
    }

    case "ownerPromoCreate": {
      const store = deps.repo.marketing;
      if (!store) return { error: "disabled" } as Fail;
      const code = str(body.code, 32);
      const day = str(body.expires, 10);
      if (day && !/^\d{4}-\d{2}-\d{2}$/.test(day)) return bad();
      const expires = day ? new Date(`${day}T23:59:59+05:00`) : null;
      if (expires && (!Number.isFinite(+expires) || +expires <= +deps.now())) return bad();
      try {
        const saved = await store.createPromo(
          u.id,
          code,
          int(body.percent),
          int(body.limit),
          expires,
          str(body.name, 80) || code,
        );
        return { ok: true as const, code: saved };
      } catch (e) {
        return promoError(e);
      }
    }

    case "ownerPromoDisable": {
      const store = deps.repo.marketing;
      if (!store) return { error: "disabled" } as Fail;
      try {
        return (await store.disablePromo(u.id, str(body.code, 32)))
          ? { ok: true as const }
          : ({ error: "notFound" } as Fail);
      } catch (e) {
        return promoError(e);
      }
    }

    case "ownerClientOrders": {
      // Свои неоплаченные приглашения владельца: отдать клиенту (ждёт оплату) или выдать бесплатно
      const list = await deps.repo.listOrdersByUser(u.id);
      return {
        orders: list
          .filter((o) => PAYABLE_STATUSES.includes(o.status))
          .sort((a, b) => +b.createdAt - +a.createdAt)
          .slice(0, 20)
          .map((o) => ({
            id: o.id,
            number: o.number,
            amount: o.amount,
            design: designName(o.templateId),
            names:
              o.data.occasion === "nikoh" ? `${o.data.groom ?? ""} ва ${o.data.bride ?? ""}` : (o.data.person ?? null),
            url: `${deps.env.publicBaseUrl}/${o.slug}`,
          })),
      };
    }

    case "ownerClientLink": {
      const id = str(body.orderId, 40);
      const o = id ? await deps.repo.getOrder(id) : null;
      if (!o || o.userId !== u.id) return { error: "notFound" } as Fail;
      if (!PAYABLE_STATUSES.includes(o.status)) return bad();
      const share = await clientOrderShare(deps, u.id, o, null);
      const wa = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
      return {
        ok: true as const,
        url: share.url,
        bot: share.bot,
        amount: share.amount,
        waUz: wa(share.uz),
        waRu: wa(share.ru),
      };
    }

    case "ownerPromotions":
      return promotions(deps);

    case "ownerPromotionCreate": {
      const name = str(body.name, 80);
      const percent = int(body.percent);
      const startsAt = almaty(body.startsAt);
      const endsAt = almaty(body.endsAt);
      const occasions = pickList(body.occasions, OCCASIONS);
      const formats = pickList(body.formats, FORMATS);
      if (
        !name ||
        !(percent >= 1 && percent <= 100) ||
        !startsAt ||
        !endsAt ||
        +endsAt <= +startsAt ||
        +endsAt <= +deps.now() ||
        occasions === false ||
        formats === false
      )
        return bad();
      const r = await deps.repo.createPromotion({
        name,
        percent,
        startsAt,
        endsAt,
        occasions,
        formats,
        forPartnerClients: body.forPartnerClients === true,
        // «Разослать клиентам» и «Охирги кун!» — по умолчанию включены
        broadcast: body.broadcast !== false,
        remind: body.remind !== false,
        createdBy: u.id,
      });
      if (r === "overlap") return { error: "exists" } as Fail;
      if (r === "missing") return { error: "disabled" } as Fail;
      return { ok: true as const, id: r.id };
    }

    case "ownerBroadcastPreview": {
      // Перед отправкой: как выглядит сообщение (уз и ру) и сколько человек его получат
      const p = (await deps.repo.listPromotions()).find((x) => x.id === str(body.id, 40));
      if (!p) return { error: "notFound" } as Fail;
      const now = deps.now();
      const uz = broadcastMessage(deps, p, "uz", "start", now);
      return {
        ok: true as const,
        recipients: (await audience(deps, p)).length,
        photo: uz.photo,
        uz: uz.caption,
        ru: broadcastMessage(deps, p, "ru", "start", now).caption,
        buttons: uz.markup.inline.flat().map((b) => b.text),
        sentAt: p.broadcastAt?.toISOString() ?? null,
      };
    }

    case "ownerBroadcastStart": {
      const r = await startBroadcast(deps, str(body.id, 40), "start");
      if ("error" in r)
        return {
          error: r.error === "notFound" ? "notFound" : r.error === "tooSoon" || r.error === "already" ? "stale" : "bad",
          reason: r.error,
        } as Fail;
      // Первая партия — сразу, остальное доотправит cron (25 сообщений в секунду)
      await runBroadcast(deps, { budgetMs: 8_000 }).catch((e) =>
        console.error("broadcast kick", e instanceof Error ? e.name : "Error"),
      );
      return { ok: true as const, queued: r.queued, recipients: r.recipients };
    }

    case "ownerPromotionStop":
      return (await deps.repo.stopPromotion(str(body.id, 40), deps.now()))
        ? { ok: true as const }
        : ({ error: "notFound" } as Fail);

    case "ownerWholesalers": {
      const list = await deps.repo.listWholesalers();
      const orders = await deps.repo.listOrdersByStatus(["active", "archived"]);
      return {
        wholesalers: await Promise.all(
          list.map(async (w) => {
            const user = await deps.repo.getUser(w.userId);
            const mine = orders.filter((o) => o.userId === w.userId && o.amount > 0);
            return {
              userId: w.userId,
              name: user?.username ? `@${user.username}` : (user?.firstName ?? `id ${w.userId}`),
              percent: w.percent,
              orders: mine.length,
              sum: mine.reduce((n, o) => n + o.amount, 0),
              since: w.createdAt.toISOString(),
            };
          }),
        ),
      };
    }

    case "ownerWholesaleSet": {
      // Кому: по № заказа клиента или по партнёру (его Telegram-аккаунт). Сотрудникам роль не даётся
      const percent = int(body.percent);
      if (!(percent >= 1 && percent <= 90)) return bad();
      let userId: number | null = null;
      if (body.orderNumber !== undefined)
        userId = (await deps.repo.getOrderByNumber(int(body.orderNumber)))?.userId ?? null;
      else if (body.partnerId !== undefined)
        userId = (await deps.repo.getPartner(int(body.partnerId)))?.telegramId ?? null;
      else if (body.userId !== undefined) userId = int(body.userId);
      if (!userId || !Number.isSafeInteger(userId)) return { error: "notFound" } as Fail;
      if ((await deps.repo.isAdmin(userId)) || (await deps.repo.getManager(userId))) return bad();
      return (await deps.repo.setWholesaler(userId, percent, u.id))
        ? { ok: true as const, userId }
        : ({ error: "notFound" } as Fail);
    }

    case "ownerWholesaleRemove":
      return (await deps.repo.removeWholesaler(int(body.userId), deps.now()))
        ? { ok: true as const }
        : ({ error: "notFound" } as Fail);
  }
}
