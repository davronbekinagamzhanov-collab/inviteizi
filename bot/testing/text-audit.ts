/**
 * Проверка текстов бота (аудит 17.11.2026): что клиент видит в сообщениях и на кнопках.
 * undefined/null/NaN, старые цены, пустые сообщения, одно и то же сообщение дважды подряд (только на чистом пути).
 */
import type { FakeMessage } from "./fake-tg";
import { inlineButtons } from "./fake-tg";

const OLD_PRICE = /\b[568][  ]?000\s?₸/;
const BROKEN = /\bundefined\b|\bnull\b|\bNaN\b|\[object /;
/**
 * Слова другого языка не проверяем автоматически: в русском боте законно стоят имена, названия дизайнов,
 * «Наҳорги ош» и узбекский текст приглашения. Их просмотрели глазами (отчёт finish-1).
 */
export function auditTexts(messages: FakeMessage[], chatId: number, _lang: "uz" | "ru", duplicates = true) {
  const out: string[] = [];
  const mine = messages.filter((m) => m.chatId === chatId);
  mine.forEach((m, i) => {
    const buttons = inlineButtons(m).map((b) => b.text);
    const all = [m.text, ...buttons];
    if (m.type === "text" && !m.text.trim()) out.push(`пустое сообщение #${m.id}`);
    for (const t of all) {
      if (BROKEN.test(t)) out.push(`битый текст: ${t.slice(0, 120)}`);
      if (OLD_PRICE.test(t)) out.push(`старая цена: ${t.slice(0, 120)}`);
    }
    const prev = mine[i - 1];
    if (duplicates && prev && prev.type === m.type && prev.text === m.text && m.text.length > 20)
      out.push(`два одинаковых сообщения подряд: ${m.text.slice(0, 80)}`);
  });
  return [...new Set(out)];
}
