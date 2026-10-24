/**
 * Логика бота: handle(deps, update). Telegram — только через deps.tg, база — через deps.repo.
 * Бот помнит шаг (users.step) и черновик (users.state); на непонятное — подсказка и повтор вопроса.
 */
import type { BotUpdate } from "../update";
import type { Ctx, Deps, Draft, Result, Step, StepId } from "./types";
import { cat, catalog, fmt } from "./steps-order";
import { age, bride, cause, groom, hosts, person, relation, sideAsk, sideBride } from "./steps-form";
import { evAddress, evDate, evLoc, evSameDay, evTime, evTimeCustom, evVenue, more } from "./steps-event";
import { evMenu, music, musicList, musicOwn, review, text, textOwn } from "./steps-final";
import { approve, askReceipt, askRejectReason, editOrder, myOrders, payOrder, receipt, reject, resendLink } from "./orders";
import { cmdFind, cmdOrders, cmdStats } from "./admin";
import { mainMenu, send, texts, txFor } from "./util";
import type { Lang } from "@/lib/domain";

const idle: Step = {
  async ask(c) {
    await send(c, c.tx.idle, mainMenu(c.tx));
  },
};

export const steps: Record<StepId, Step> = {
  idle,
  cat,
  fmt,
  catalog,
  groom,
  bride,
  relation,
  person,
  cause,
  age,
  hosts,
  sideAsk,
  sideBride,
  evDate,
  evSameDay,
  evTime,
  evTimeCustom,
  evVenue,
  evAddress,
  evLoc,
  more,
  text,
  textOwn,
  music,
  musicList,
  musicOwn,
  review,
  evMenu,
  receipt,
};

const BACK_LIMIT = 60;
const isStep = (s: string): s is StepId => s in steps;

export async function handle(deps: Deps, u: BotUpdate): Promise<void> {
  const isStart = u.kind === "command" && u.command === "start";
  const user = await deps.repo.touchUser({
    id: u.from.id,
    username: u.from.username,
    firstName: u.from.firstName,
    source: isStart && u.args ? u.args.slice(0, 64) : null,
  });
  const c: Ctx = {
    deps,
    u,
    user,
    lang: user.lang ?? "uz",
    tx: txFor(user.lang),
    chatId: u.chatId,
    step: isStep(user.step) ? user.step : "idle",
    s: (user.state ?? {}) as Draft,
    answered: false,
    q0: Number((user.state as Draft | null)?.q ?? 0),
  };
  try {
    await route(c);
  } catch (e) {
    // Никогда не молчим: клиенту — короткое «хатолик, қайта уриниб кўринг», в лог — только текст ошибки
    console.error("bot route", u.kind, e instanceof Error ? e.message : e);
    await deps.tg.sendMessage(u.chatId, c.tx.error).catch(() => {});
  } finally {
    if (u.kind === "callback" && !c.answered) await deps.tg.answerCallbackQuery(u.callbackId).catch(() => {});
  }
}

// ── Переходы ──

async function save(c: Ctx) {
  await c.deps.repo.saveStep(c.user.id, c.step, c.s as Record<string, unknown>);
}

async function ask(c: Ctx) {
  c.s.q = Math.max(c.s.q ?? 0, c.q0) + 1;
  await steps[c.step].ask(c);
  await save(c);
}

/** Начать сценарий с вопроса (стек «Назад» пустой) */
async function enter(c: Ctx, step: StepId, s: Draft = {}) {
  c.s = { ...s, q: c.s.q, back: [] };
  c.step = step;
  await ask(c);
}

async function finish(c: Ctx) {
  c.step = "idle";
  c.s = { q: c.s.q };
  await save(c);
}

async function apply(c: Ctx, r: Result) {
  if (r === null) {
    const current = steps[c.step];
    await send(c, current.onMessage ? c.tx.sendText : c.tx.pressButton);
    return ask(c);
  }
  if ("hint" in r) {
    await send(c, r.hint);
    return ask(c);
  }
  if ("stay" in r) return save(c);
  if ("done" in r) return finish(c);
  if ("wait" in r) {
    c.step = r.wait;
    c.s.back = [];
    return save(c);
  }
  if ("enter" in r) return enter(c, r.enter, c.s);
  // to: запоминаем, куда вернуться по «Назад»
  const back = (c.s.back ??= []);
  back.push({ step: c.step, ev: c.s.ev, ret: c.s.ret });
  if (back.length > BACK_LIMIT) back.splice(0, back.length - BACK_LIMIT);
  c.step = r.to;
  await ask(c);
}

async function goBack(c: Ctx) {
  if (steps[c.step].replyKeyboard) await send(c, c.tx.ok, mainMenu(c.tx));
  const prev = c.s.back?.pop();
  if (!prev) {
    c.step = "idle";
    c.s = { q: c.s.q };
    return ask(c);
  }
  c.step = prev.step;
  c.s.ev = prev.ev;
  if (prev.ret) c.s.ret = prev.ret;
  else delete c.s.ret;
  await ask(c);
}

/** Повторить текущий вопрос (после смены языка, непонятной команды) */
async function reask(c: Ctx) {
  if (c.step === "idle") return;
  await ask(c);
}

// ── Язык и меню ──

async function askLang(c: Ctx) {
  const tx = texts.uz;
  await send(c, tx.chooseLang, { inline: [[{ text: tx.langUz, data: "lang:uz" }, { text: tx.langRu, data: "lang:ru" }]] });
}

async function chooseLang(c: Ctx, lang: string) {
  if (lang !== "uz" && lang !== "ru") return;
  const first = !c.user.lang;
  await c.deps.repo.setLang(c.user.id, lang);
  c.lang = lang as Lang;
  c.tx = texts[c.lang];
  if (first) {
    await send(c, c.tx.welcome(c.user.firstName), mainMenu(c.tx));
    return;
  }
  await send(c, c.tx.langSaved, mainMenu(c.tx));
  await reask(c);
}

async function welcome(c: Ctx) {
  c.step = "idle";
  c.s = { q: c.s.q };
  await save(c);
  await send(c, c.tx.welcome(c.user.firstName), mainMenu(c.tx));
}

async function help(c: Ctx) {
  await send(c, c.tx.help, { inline: [[{ text: c.tx.contact, url: `https://t.me/${c.deps.env.ownerUsername.replace(/^@/, "")}` }]] });
}

type MenuKey = keyof (typeof texts)["uz"]["menu"];
function menuKey(text: string): MenuKey | null {
  for (const tx of Object.values(texts)) {
    for (const [k, label] of Object.entries(tx.menu)) if (label === text) return k as MenuKey;
  }
  return null;
}

const isBackLabel = (text: string) => Object.values(texts).some((tx) => tx.back === text);

async function menu(c: Ctx, key: MenuKey) {
  switch (key) {
    case "create":
      return enter(c, "cat");
    case "my":
      await finish(c);
      return myOrders(c);
    case "help":
      return help(c);
    case "lang":
      return askLang(c);
  }
}

async function unknown(c: Ctx) {
  if (c.step === "idle") {
    await send(c, `${c.tx.unknown} ${c.tx.idle}`, mainMenu(c.tx));
    return;
  }
  await send(c, c.tx.unknown);
  await ask(c);
}

// ── Маршрутизация ──

async function route(c: Ctx) {
  const u = c.u;

  if (u.kind === "callback") {
    const d = u.data;
    if (d.startsWith("lang:")) return chooseLang(c, d.slice(5));
    // Решение по чеку — даже если админ ещё не выбрал язык
    if (!c.user.lang && !/^(ok|no|nr):/.test(d)) return askLang(c);
    return onCallback(c, d);
  }

  if (u.kind === "command" && u.command === "start") {
    if (!c.user.lang) return askLang(c);
    return welcome(c);
  }
  if (!c.user.lang) return askLang(c);

  if (u.kind === "command") return onCommand(c, u.command, u.args);

  if (u.kind === "text") {
    const key = menuKey(u.text.trim());
    if (key) return menu(c, key);
    if (isBackLabel(u.text.trim()) && c.step !== "idle") return goBack(c);
  }

  const step = steps[c.step];
  if (c.step === "idle" || !step.onMessage) {
    if (c.step === "idle") return idle.ask(c);
    return apply(c, null);
  }
  return apply(c, await step.onMessage(c));
}

async function onCommand(c: Ctx, command: string, args: string) {
  switch (command) {
    case "help":
      return help(c);
    case "my":
      await finish(c);
      return myOrders(c);
    case "lang":
      return askLang(c);
    case "new":
      return enter(c, "cat");
  }
  if (["orders", "stats", "find"].includes(command) && (await c.deps.repo.isAdmin(c.user.id))) {
    if (command === "orders") return cmdOrders(c);
    if (command === "stats") return cmdStats(c);
    return cmdFind(c, args);
  }
  return unknown(c);
}

async function toast(c: Ctx, text: string) {
  await c.deps.tg.answerCallbackQuery((c.u as { callbackId: string }).callbackId, { text });
  c.answered = true;
}

async function onCallback(c: Ctx, d: string) {
  const [kind, a, b] = d.split(":");
  const n = Number(a);
  switch (kind) {
    case "noop":
      return;
    case "pay":
      return apply(c, await payOrder(c, n));
    case "rcpt":
      return apply(c, await askReceipt(c, n));
    case "edit":
      return apply(c, await editOrder(c, n));
    case "link":
      return apply(c, await resendLink(c, n));
    case "new":
      // «🆕 Янги таклифнома» после оплаты: всё с нуля, старые данные не подставляем
      c.s = { q: c.s.q };
      return enter(c, "cat");
    case "ok":
      return approve(c, n);
    case "no":
      return askRejectReason(c, n);
    case "nr":
      return reject(c, n, b ?? "");
    case "a": {
      const value = d.split(":").slice(2).join(":");
      if (n !== (c.s.q ?? 0) || c.step === "idle") return toast(c, c.tx.oldButton);
      if (value === "x") return;
      if (value === "back") return goBack(c);
      const step = steps[c.step];
      if (!step.onButton) return toast(c, c.tx.oldButton);
      return apply(c, await step.onButton(c, value));
    }
  }
  return toast(c, c.tx.oldButton);
}
