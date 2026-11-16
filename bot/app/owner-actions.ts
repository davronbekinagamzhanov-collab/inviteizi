/**
 * Админка владельца в Mini App (16.11.2026): действия выполняются тем же кодом, что и кнопки бота,
 * поэтому проверки, уведомления клиенту и начисления партнёрам те же. Только админ (initData, не URL),
 * только действия из белого списка. Ответ на экранах бота (списки, мастер партнёра, промокоды) приходит в чат с ботом.
 */
import type { AppUser } from "@/lib/tg-init-data";
import type { OrderRecord } from "@/lib/domain";
import type { StaffGrantReason } from "@/lib/types";
import { handle } from "../flow";
import type { Deps } from "../flow/types";
import { designName } from "../flow/util";

/** Кнопки бота владельца, которые можно нажать из админки */
const CALLBACKS = /^(ok:\d{1,9}|nr:\d{1,9}:(nopay|money|sum|other)|pn:(stats|rc|pt|po|ex|set|madd|cl)|pa:new)$/;
/** Команды владельца (промокоды PR #20 и др.) */
const COMMANDS = new Set(["promos", "corrections", "delivery", "referrals"]);

export async function ownerAct(deps: Deps, u: AppUser, action: unknown) {
  if (!(await deps.repo.isAdmin(u.id))) return { error: "forbidden" as const };
  if (typeof action !== "string") return { error: "bad" as const };
  const command = action.startsWith("/") ? action.slice(1) : null;
  if (command !== null ? !COMMANDS.has(command) : !CALLBACKS.test(action)) return { error: "bad" as const };
  const from = { id: u.id, username: u.username, firstName: u.firstName };
  // Нажатие пришло не из сообщения бота: «ответить на кнопку» и «убрать кнопки у сообщения» — некуда
  const skip = new Set<PropertyKey>(["answerCallbackQuery", "editMessageReplyMarkup"]);
  const tg = new Proxy(deps.tg, {
    get(target, key) {
      if (skip.has(key)) return async () => {};
      const value = Reflect.get(target, key, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  const ok = await handle(
    { ...deps, tg },
    command !== null
      ? { from, chatId: u.id, messageId: 0, kind: "command", command, args: "" }
      : { from, chatId: u.id, messageId: 0, kind: "callback", callbackId: "app", data: action },
  );
  return ok ? { ok: true as const } : { error: "server" as const };
}

export type OwnerReceipt = {
  number: number;
  amount: number;
  design: string;
  client: string;
  names: string | null;
  sentAt: string | null;
  url: string | null;
  /** Оплата без чека: имя плательщика, как в Kaspi (null — пришёл чек) */
  payerName: string | null;
  /** Есть файл чека (фото/PDF) — можно открыть в боте */
  hasReceipt: boolean;
};

/** Чеки на проверке — без учёта периода, старые сверху */
export async function ownerReceipts(deps: Deps): Promise<OwnerReceipt[]> {
  const list = await deps.repo.listOrdersByStatus(["receipt_sent"]);
  return list
    .sort((a, b) => +(a.receiptAt ?? a.updatedAt) - +(b.receiptAt ?? b.updatedAt))
    .slice(0, 50)
    .map((o: OrderRecord) => ({
      number: o.number,
      amount: o.amount,
      design: designName(o.templateId),
      client: `id ${o.userId}`,
      names: o.data.occasion === "nikoh" ? `${o.data.groom ?? ""} ва ${o.data.bride ?? ""}` : (o.data.person ?? null),
      sentAt: (o.receiptAt ?? o.updatedAt)?.toISOString() ?? null,
      url: `${deps.env.publicBaseUrl}/${o.slug}`,
      payerName: o.payerName ?? null,
      hasReceipt: Boolean(o.receipt),
    }));
}

/** Бесплатные выдачи владельца за период по причинам (сумма 0, в продажах не считаются) */
export async function ownerFreeGrants(deps: Deps, from: Date, to: Date) {
  const list = await deps.repo.listOrdersByStatus(["active", "archived"]);
  const out: Record<StaffGrantReason, number> = { gift: 0, sample: 0, cash: 0, replace: 0 };
  for (const o of list) {
    const g = o.data.staffGrant;
    if (!g) continue;
    const at = new Date(g.at);
    if (+at >= +from && +at < +to && g.reason in out) out[g.reason]++;
  }
  return out;
}
