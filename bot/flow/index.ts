/**
 * Логика бота: handle(deps, update). Telegram — только через deps.tg, база — через deps.repo.
 * Бот помнит шаг (users.step) и черновик (users.state); на непонятное — подсказка и повтор вопроса.
 */
import type { BotUpdate } from "../update";
import type { Ctx, Deps, Draft, Result, Step, StepId } from "./types";
import { cat, catalog, dropCatalog, fmt } from "./steps-order";
import { age, bride, cause, groom, hosts, person, relation, sideAsk, sideBride } from "./steps-form";
import { photoAsk, photoUpload } from "./steps-photo";
import { evPlaces, evVenueName, evMap, evLink, evAddress, evDate, evLoc, evSameDay, evTime, evTimeCustom, evVenue, more } from "./steps-event";
import { evMenu, langs, langText, music, musicList, musicOwn, review, rsvp, text, textOwn } from "./steps-final";
import { approve, askReceipt, askRejectReason, editOrder, myOrders, payOrder, receipt, reject, resendLink, rsvpAnswers } from "./orders";
import { cmdFind, cmdOrders, cmdStats } from "./admin";
import { mainMenu, ownerUrl, roleOf, send, startMenu, texts, txFor } from "./util";
import type { Lang } from "@/lib/domain";
import { dashboard } from "./dashboard";
import {
  acceptPartnerInvite,
  joinKaspi,
  joinLang,
  joinPhone,
  partnerAction,
  partnerConfirm,
  partnerName,
  partnerPhone,
  partnerPropose,
  partnerProposeSchedule,
  partnerRate,
  partnerRateEdit,
  partnerSchedule,
  partnerStats,
  ptAction,
  sendPoster,
} from "./partners";
import { favorites, favoriteAction } from "./favorites";
import { activeDesigns } from "@/templates/registry";
import { catalogList, pageOf } from "./steps-order";
import { rememberUpdate } from "../update";
import { classifyError, isUnreachable, recordBotError, toEntry } from "../errors";
import { beginAttempt } from "./delivery";
import { acceptManager, claimOrder, panelAction, roleHome, showClaimed, toClient } from "./panel";
import { parseStartToken } from "@/lib/roles";
import { gotPayout, payManagerAction, payPartnerAction } from "./notify";
import { partnerStatsAction, statsAction } from "./stats";
import { rate, reviewText, skipReviewText, stopNudges } from "./care";
import { exportAction } from "./export";

const idle: Step = {
  async ask(c) {
    await send(c, c.tx.idle, await startMenu(c));
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
  photoAsk,
  photoUpload,
  evDate,
  evSameDay,
  evTime,
  evTimeCustom,
  evVenue,
  evAddress,
  evLoc, evPlaces, evVenueName, evMap, evLink,
  more,
  text,
  textOwn,
  music,
  musicList,
  musicOwn,
  rsvp,
  langs,
  langText,
  review,
  evMenu,
  receipt,
  partnerName,
  partnerPhone,
  partnerRate,
  partnerSchedule,
  partnerConfirm,
  partnerRateEdit,
  partnerPropose,
  partnerProposeSchedule,
  joinLang,
  joinPhone,
  joinKaspi,
};

const BACK_LIMIT = 60;
const isStep = (s: string): s is StepId => s in steps;

/**
 * true → webhook отвечает 200, повтора не будет; false → 503, Telegram повторит этот update.
 * Повторяем только временные сбои (сеть, 429/5xx Telegram, соединение с базой) и не больше MAX_ATTEMPTS раз.
 * Пока повтор возможен, клиенту ничего не пишем: иначе он получит ошибку, а затем обычный ответ.
 */
export async function handle(baseDeps: Deps, u: BotUpdate): Promise<boolean> {
  const attempt = beginAttempt(baseDeps, u.updateId);
  const deps: Deps = { ...baseDeps, tg: attempt.tg };
  let c: Ctx | undefined;
  try {
    const isStart = u.kind === "command" && u.command === "start";
    const user = await deps.repo.touchUser({
      id: u.from.id,
      username: u.from.username,
      firstName: u.from.firstName,
      // Одноразовые ссылки (mgr_, join_, o_) — не источник клиента и не должны лежать в базе
      source: isStart && u.args && !parseStartToken(u.args) ? u.args.slice(0, 64) : null,
    });
    if (u.updateId !== undefined && rememberUpdate(user.state.handledUpdates).includes(u.updateId)) {
      attempt.finish();
      return true;
    }
    c = {
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
    await route(c);
    attempt.finish();
    return true;
  } catch (e) {
    const retry = attempt.canRetry && classifyError(e) === "transient";
    const entry = toEntry(e, u, c?.step ?? null, retry ? "retry" : "ack");
    console.error("bot route", u.kind, entry.errorName, entry.errorCode ?? "", entry.outcome);
    await recordBotError(deps, entry);
    if (retry) return false;
    attempt.finish();
    if (!isUnreachable(e)) await deps.tg.sendMessage(u.chatId, (c?.tx ?? txFor(null)).error).catch(() => {});
    return true;
  } finally {
    if (u.kind === "callback" && !c?.answered) await deps.tg.answerCallbackQuery(u.callbackId).catch(() => {});
  }
}

// ── Переходы ──

async function save(c: Ctx) {
  if (c.u.updateId !== undefined || c.user.state.handledUpdates) c.s.handledUpdates = rememberUpdate(c.user.state.handledUpdates,c.u.updateId);
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
  if (r && "ignore" in r) return;
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
  delete c.s.venueNameInput;
  if (c.step === "catalog") await dropCatalog(c);
  if (steps[c.step].replyKeyboard) await send(c, c.tx.ok, mainMenu());
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
  // Казахский — только при KAZAKH_ENABLED (тексты ждут проверки носителем)
  const kk = Boolean(c.deps.env.kazakhEnabled);
  const row = [{ text: tx.langUz, data: "lang:uz" }, { text: tx.langRu, data: "lang:ru" }, ...(kk ? [{ text: tx.langKk, data: "lang:kk" }] : [])];
  await send(c, kk ? tx.chooseLang3 : tx.chooseLang, { inline: [row] });
}

async function chooseLang(c: Ctx, lang: string) {
  if (lang !== "uz" && lang !== "ru" && !(lang === "kk" && c.deps.env.kazakhEnabled)) return;
  const first = !c.user.lang;
  c.lang = lang as Lang;
  c.tx = texts[c.lang];
  // Сначала сообщение, потом запись: при повторе после сбоя клиент всё равно получит приветствие
  await setAppButton(c);
  if (first) {
    const claimed = c.s.claimed ? await c.deps.repo.getOrderByNumber(c.s.claimed) : null;
    if (claimed) await showClaimed(c, claimed);
    else if (!(await roleHome(c, true))) await send(c, c.tx.welcome(c.user.firstName), await startMenu(c));
    await c.deps.repo.setLang(c.user.id, lang);
    if (c.s.claimed) {
      c.s = { q: c.s.q };
      await save(c);
    }
    return;
  }
  await c.deps.repo.setLang(c.user.id, lang);
  if (c.step === "idle") await send(c, c.tx.langSaved, await startMenu(c));
  else {
    await send(c, c.tx.langSaved);
    await reask(c);
  }
}

/** Кнопка меню Telegram у поля ввода: «✨ Очиш» открывает приложение (на языке клиента) */
async function setAppButton(c: Ctx) {
  if (c.chatId !== c.user.id) return;
  const url = c.deps.env.miniAppUrl;
  await c.deps.tg.setMenuButton(c.chatId, url ? { text: c.tx.menuButton, url } : null).catch((e) => console.warn("menu button", e instanceof Error ? e.name : "Error"));
}

/** Убрать старую нижнюю клавиатуру незаметно: служебное сообщение сразу удаляется */
async function dropReplyKeyboard(c: Ctx) {
  try {
    const m = await c.deps.tg.sendMessage(c.chatId, c.tx.ok, { markup: mainMenu() });
    await c.deps.tg.deleteMessage(c.chatId, m.messageId);
  } catch (e) {
    console.warn("reply keyboard", e instanceof Error ? e.name : "Error");
  }
}

async function welcome(c: Ctx) {
  await dropCatalog(c);
  c.step = "idle";
  c.s = { q: c.s.q };
  await dropReplyKeyboard(c);
  await setAppButton(c);
  // Запись последней: записанный update повторно не обрабатывается, и приветствие бы потерялось
  if (!(await roleHome(c))) await send(c, c.tx.welcome(c.user.firstName), await startMenu(c));
  await save(c);
}

async function help(c: Ctx) {
  await send(c, c.tx.help, { inline: [[{ text: c.tx.contact, url: ownerUrl(c) }]] });
}

type MenuKey = keyof (typeof texts)["uz"]["menu"];
function menuKey(text: string): MenuKey | null {
  for (const tx of Object.values(texts)) {
    for (const labels of [tx.menu, tx.menuLegacy]) for (const [k, label] of Object.entries(labels)) if (label === text) return k as MenuKey;
  }
  return null;
}

const isBackLabel = (text: string) => Object.values(texts).some((tx) => tx.back === text);

async function menu(c: Ctx, key: MenuKey) {
  switch (key) {
    case "create":
      return enter(c, "cat");
    case "my":
      await myOrders(c);
      return finish(c);
    case "help":
      return help(c);
    case "lang":
      return askLang(c);
  }
}

async function unknown(c: Ctx) {
  if (c.step === "idle") {
    await send(c, `${c.tx.unknown} ${c.tx.idle}`, await startMenu(c));
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
    // Решение по чеку — даже если админ ещё не выбрал язык; партнёр по ссылке выбирает язык своим шагом
    if (!c.user.lang && !/^(ok|no|nr):/.test(d) && c.step !== "joinLang") return askLang(c);
    return onCallback(c, d);
  }

  if (u.kind === "command" && u.command === "start") {
    const token = parseStartToken(u.args);
    if (token?.kind === "mgr") {
      await acceptManager(c, token.token);
      if (!c.user.lang) return askLang(c);
      return welcome(c);
    }
    if (token?.kind === "join") {
      const r = await acceptPartnerInvite(c, token.token);
      if (r !== "home" && r !== "failed") return apply(c, r);
      if (!c.user.lang) return askLang(c);
      return welcome(c);
    }
    if (token?.kind === "o") {
      const r = await claimOrder(c, token.token);
      if (r === "askLang") {
        await save(c);
        return askLang(c);
      }
      return;
    }
    if (!c.user.lang) return askLang(c);
    return welcome(c);
  }
  // Партнёр по ссылке ещё не выбрал язык: повторить его вопрос (на двух языках), а не общий
  if (!c.user.lang) return c.step === "joinLang" ? ask(c) : askLang(c);

  if (u.kind === "command") return onCommand(c, u.command, u.args);

  if (u.kind === "text") {
    const key = menuKey(u.text.trim());
    if (key) return menu(c, key);
    if (isBackLabel(u.text.trim()) && c.step !== "idle") return goBack(c);
  }

  // Отзыв: первое сообщение после оценки — его текст (анкету не трогает)
  if (u.kind === "text" && c.s.reviewFor && (await reviewText(c))) return save(c);

  const step = steps[c.step];
  if (c.step === "idle" || !step.onMessage) {
    if (c.step === "idle") return idle.ask(c);
    return apply(c, null);
  }
  return apply(c, await step.onMessage(c));
}

async function onCommand(c: Ctx, command: string, args: string) {
  if (command === "favorites") return favorites(c);
  if (command === "dashboard") {
    // v2: /dashboard владельца — новая «📊 Статистика»; остальным — прежний отказ
    if (c.chatId === c.user.id && (await roleOf(c)) === "owner") return statsAction(c, "st", "d", "money");
    const r = await dashboard(c);
    return r ? apply(c, r) : undefined;
  }
  if (command === "hamkor") {
    if (await partnerStats(c)) return;
    return unknown(c);
  }
  if (command === "stats") {
    if (c.chatId !== c.user.id || !(await c.deps.repo.canAnalyze(c.user.id))) return unknown(c);
    return cmdStats(c);
  }
  switch (command) {
    case "help":
      return help(c);
    case "my":
      await myOrders(c);
      return finish(c);
    case "lang":
      return askLang(c);
    case "new":
      return enter(c, "cat");
  }
  if (["orders", "find"].includes(command) && c.chatId === c.user.id && (await c.deps.repo.isAdmin(c.user.id))) {
    if (command === "orders") return cmdOrders(c);
    return cmdFind(c, args);
  }
  return unknown(c);
}

async function toast(c: Ctx, text: string) {
  await c.deps.tg.answerCallbackQuery((c.u as { callbackId: string }).callbackId, { text });
  c.answered = true;
}

/**
 * Нажали старую кнопку. Двойное нажатие (кнопка прошлого вопроса) — только всплывашка.
 * Совсем старая — у того сообщения убираем кнопки и пишем «Бу тугма эскирган 👇» + меню или текущий вопрос.
 */
async function stale(c: Ctx, n?: number) {
  if (n !== undefined && c.step !== "idle" && n === (c.s.q ?? 0) - 1) return toast(c, c.tx.oldButton);
  await toast(c, c.tx.oldButton);
  await c.deps.tg.editMessageReplyMarkup(c.chatId, c.u.messageId, null).catch(() => undefined);
  if (c.step === "idle") return void (await send(c, c.tx.oldButton, await startMenu(c)));
  await send(c, c.tx.oldButton);
  await ask(c);
}

async function onCallback(c: Ctx, d: string) {
  if (d === "favorites") return favorites(c);
  if (d.startsWith("m:")) {
    const key = d.slice(2);
    if (key === "create" || key === "my" || key === "help" || key === "lang") return menu(c, key);
    return stale(c);
  }
  if (d.startsWith("pn:")) {
    const [, action, arg = ""] = d.split(":");
    const r = await panelAction(c, action, arg);
    return r ? apply(c, r) : undefined;
  }
  if (d.startsWith("pa:")) {
    const [, action, id = "", x = ""] = d.split(":");
    const r = await ptAction(c, action, id, x);
    return r ? apply(c, r) : undefined;
  }
  if (d.startsWith("st:") || d.startsWith("sm:")) {
    const [prefix, p = "", sec = ""] = d.split(":");
    return statsAction(c, prefix as "st" | "sm", p, sec);
  }
  if (d.startsWith("sp:")) return partnerStatsAction(c, d.slice(3));
  if (d.startsWith("ex:")) return exportAction(c, d.slice(3));
  if (d.startsWith("po:")) {
    const [, id = "", amount = ""] = d.split(":");
    return payPartnerAction(c, id, amount);
  }
  if (d.startsWith("mp:")) {
    const [, id = "", month = "", amount = ""] = d.split(":");
    return payManagerAction(c, id, month, amount);
  }
  if (d === "pg") return gotPayout(c);
  if (d === "care:stop") return stopNudges(c);
  if (d.startsWith("rv:")) {
    const [, n = "", x = ""] = d.split(":");
    if (x === "skip") {
      await skipReviewText(c);
      return save(c);
    }
    await rate(c, n, x);
    return save(c);
  }
  if (d.startsWith("pq:")) {
    const [, id = "", lang = ""] = d.split(":");
    return sendPoster(c, id, lang);
  }
  if (d.startsWith("cl:")) {
    const r = await toClient(c, Number(d.slice(3)));
    return r ? apply(c, r) : undefined;
  }
  if (d.startsWith("dash:")) {
    const [, view, period, a, b] = d.split(":");
    const r = await dashboard(c, view, period, a, b);
    return r ? apply(c, r) : undefined;
  }
  if (d.startsWith("dp:")) {
    const [, action, id, amount] = d.split(":");
    const r = await partnerAction(c, action, id, amount);
    return r ? apply(c, r) : undefined;
  }
  if (d.startsWith("fav:")) {
    const [, action, id] = d.split(":");
    if (action !== "choose") return favoriteAction(c, action, id);
    if (c.chatId !== c.user.id || !(await c.deps.repo.listFavorites(c.user.id)).includes(id)) return;
    const design = activeDesigns().find(d => d.id === id);
    if (!design) return;
    const catIdx = pageOf(catalogList({ s: { occasion: design.occasion } }), id);
    // Идёт правка заказа или заполнение анкеты того же тадбира: меняем дизайн в ней, а не начинаем новый заказ
    if (c.s.data && c.s.occasion === design.occasion && !c.s.paid) {
      c.s = { ...c.s, catIdx, ret: c.s.ret ?? (c.s.orderId ? "review" : undefined), back: [] };
      c.step = "catalog";
      return ask(c);
    }
    if (c.s.orderId) return void (await send(c, c.tx.order.formatLocked));
    return enter(c, "catalog", { occasion: design.occasion, format: design.format, catIdx });
  }
  const [kind, a, b] = d.split(":");
  const n = Number(a);
  switch (kind) {
    case "noop":
      return;
    case "pay":
      return apply(c, await payOrder(c, n));
    case "rcpt":
      return apply(c, await askReceipt(c, n, b === undefined ? undefined : Number(b)));
    case "edit":
      return apply(c, await editOrder(c, n));
    case "link":
      return apply(c, await resendLink(c, n));
    case "rsvp":
      return apply(c, await rsvpAnswers(c, n));
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
      if (n !== (c.s.q ?? 0) || c.step === "idle") return stale(c, n);
      if (value === "x") return;
      if (value === "back") return goBack(c);
      const step = steps[c.step];
      if (!step.onButton) return stale(c, n);
      return apply(c, await step.onButton(c, value));
    }
  }
  return stale(c);
}
