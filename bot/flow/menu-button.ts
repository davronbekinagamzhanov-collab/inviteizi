import type { Role } from "@/lib/roles";
import type { Deps } from "./types";

/**
 * Кнопка меню Telegram у поля ввода — по роли (16.11.2026):
 * владелец/админ → «InviteIZI · Админ» (/app/owner), менеджер и партнёр → «InviteIZI · Панель» (/app/panel),
 * клиент → клиентское приложение (/app). Права в самих приложениях проверяет сервер по initData, не по адресу.
 */
export const MENU_TEXT = { owner: "InviteIZI · Админ", staff: "InviteIZI · Панель" } as const;

export function menuButtonFor(miniAppUrl: string, role: Role, clientText: string) {
  if (role === "owner") return { text: MENU_TEXT.owner, url: `${miniAppUrl}/owner` };
  if (role === "manager" || role === "partner") return { text: MENU_TEXT.staff, url: `${miniAppUrl}/panel` };
  return { text: clientText, url: miniAppUrl };
}

/** Поставить кнопку меню в личном чате; без Mini App — обычное меню команд. Ошибка Telegram не мешает ответу */
export async function syncMenuButton(deps: Pick<Deps, "env" | "tg">, chatId: number, role: Role, clientText: string) {
  const url = deps.env.miniAppUrl;
  await deps.tg
    .setMenuButton(chatId, url ? menuButtonFor(url, role, clientText) : null)
    .catch((e) => console.warn("menu button", e instanceof Error ? e.name : "Error"));
}
