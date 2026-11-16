"use client";
/**
 * Mini App InviteIZI: каталог → просмотр → анкета с живым превью → фото → «Бот танлади» → оплата → мои заказы.
 * Черновик сохраняется на сервере (закрыл — открыл — продолжает), заказ — тот же, что видит чат.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { AppDraft, AppOrder, AppSession, SubmitResult } from "@/bot/app/service";
import type { Lang } from "@/lib/domain";
import { validateForm, type FieldError, type FormInput } from "@/lib/order-rules";
import { previewData } from "@/lib/preview-data";
import { getDesign, PRICES, thumbOf, type Design } from "@/templates/registry";
import { appUz } from "@/texts/app-uz";
import { appRu } from "@/texts/app-ru";
import { appKk } from "@/texts/app-kk";
import { api, ApiError } from "./ui/api";
import { Catalog, Heart, type Chip } from "./ui/Catalog";
import { DealPrice, dealPrice, useLivePromotion } from "./ui/Deal";
import { discounted } from "@/lib/pricing-math";
import { emptyForm } from "./ui/form-defaults";

import type { Track } from "./ui/Summary";

import { isQuiet } from "@/lib/quiet-hours";

import { MainAction, TextsContext, Toast } from "./ui/shared";
import {
  haptic,
  initDataOf,
  insideTelegram,
  setupTelegram,
  tg,
  useBackButton,
  useNativeMainVisible,
} from "./ui/telegram";
import { BackIcon, CloseIcon, FolderIcon, HelpIcon } from "./ui/icons";

import { Boot } from "./ui/Boot";
import s from "./app.module.css";

// Первый экран — только каталог; остальные экраны догружаются, когда понадобятся (медленный интернет)
const Form = dynamic(() => import("./ui/Form").then((m) => m.Form), { loading: Loading });
const Photos = dynamic(() => import("./ui/Photos").then((m) => m.Photos), { loading: Loading });
const Summary = dynamic(() => import("./ui/Summary").then((m) => m.Summary), { loading: Loading });
const Pay = dynamic(() => import("./ui/Pay").then((m) => m.Pay), { loading: Loading });
const Waiting = dynamic(() => import("./ui/Pay").then((m) => m.Waiting), { loading: Loading });
const Orders = dynamic(() => import("./ui/Orders").then((m) => m.Orders), { loading: Loading });
const Help = dynamic(() => import("./ui/Help").then((m) => m.Help));

function Loading() {
  return (
    <div className={s.center} aria-busy="true">
      <span className={s.bootBar} />
    </div>
  );
}

type Screen =
  | { name: "catalog" }
  | { name: "view"; id: string }
  /** ret — правка из итога/проверки: «Сақлаш ва қайтиш» возвращает туда же */
  | { name: "form"; ret?: boolean }
  | { name: "photos" }
  | { name: "summary" }
  /** check — проверка перед оплатой, pay — реквизиты и чек (назад с реквизитов → проверка) */
  | { name: "pay"; orderId: string; step: "check" | "pay" }
  | { name: "wait"; orderId: string; night: boolean }
  | { name: "orders" };

type Phase = "boot" | "noTelegram" | "error" | "ready";
const SAVE_DELAY = 700;
/** Свой id у каждого нового черновика: сервер не воскресит отменённый черновик по запоздавшему сохранению */
const newDraftId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
/** Экраны с главной кнопкой (см. switch ниже) */
const MAIN_SCREENS = new Set<Screen["name"]>(["view", "form", "photos", "summary", "wait", "orders"]);
/** Экран ожидания проверки чека спрашивает статус раз в 10 с, только пока открыт и виден */
const POLL_MS = 10_000;
const RESUBMIT_DELAY = 900;

function namesOf(d: AppDraft) {
  const f = d.form ?? {};
  return [f.groom, f.bride].filter(Boolean).join(" & ") || f.person || "";
}

/** Скрипт Telegram пришёл позже первого экрана — настраиваем его, как только появится */
function waitTelegram() {
  const id = setInterval(() => {
    if (!tg()) return;
    clearInterval(id);
    setupTelegram();
  }, 250);
  setTimeout(() => clearInterval(id), 60_000);
}

function guessLang(): Lang {
  try {
    const user = JSON.parse(new URLSearchParams(initDataOf()).get("user") ?? "{}") as { language_code?: string };
    return user.language_code?.startsWith("ru") ? "ru" : "uz";
  } catch {
    return "uz";
  }
}

/** Через 8 с загрузки — «Интернет секин, кутинг…» и «Қайта уриниш» */
const SLOW_MS = 8000;

export default function MiniApp({ fontClass }: { fontClass: string }) {
  const [phase, setPhase] = useState<Phase>("boot");
  const [slow, setSlow] = useState(false);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    if (phase !== "boot") return;
    const id = setTimeout(() => setSlow(true), SLOW_MS);
    return () => clearTimeout(id);
  }, [phase]);
  const [session, setSession] = useState<AppSession | null>(null);
  const [lang, setLang] = useState<Lang>("uz");
  const T = lang === "ru" ? appRu : lang === "kk" ? appKk : appUz;
  const [chip, setChip] = useState<Chip>("nikoh");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [draft, setDraft] = useState<AppDraft | null>(null);
  const [orders, setOrders] = useState<AppOrder[]>([]);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [stack, setStack] = useState<Screen[]>([{ name: "catalog" }]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [otherTracks, setOtherTracks] = useState<Track[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [photosBusy, setPhotosBusy] = useState(0);
  const [saveStatus, setSaveStatus] = useState("");
  const [viewer, setViewer] = useState<string | null>(null);
  const [bigOpen, setBigPreview] = useState(false);
  const [help, setHelp] = useState(false);
  const screen = stack[stack.length - 1];
  // Большое превью живёт только на анкете: ушли с неё — закрыто
  const bigPreview = bigOpen && screen.name === "form";
  const nativeMain = useNativeMainVisible();
  const design: Design | undefined = draft?.templateId ? getDesign(draft.templateId) : undefined;
  const order = orders.find((o) => o.id === draft?.orderId) ?? null;

  // ── Запуск ──
  const boot = useCallback(async () => {
    // Подпись Telegram есть в адресе — сразу идём на сервер; скрипт Telegram догрузится сам (кнопки, вибро).
    // Без подписи в адресе ждём скрипт до 10 с (старые клиенты)
    if (!initDataOf()) for (let i = 0; i < 100 && !tg(); i++) await new Promise((r) => setTimeout(r, 100));
    setupTelegram();
    if (!tg()) waitTelegram();
    if (!initDataOf()) return setPhase("noTelegram");
    // До ответа сервера — язык Telegram (экран загрузки уже на нём)
    setLang(guessLang());
    try {
      const sess = await api<AppSession>("session");
      setSession(sess);
      setLang(sess.lang);
      setFavorites(sess.favorites);
      setOrders(sess.orders);
      bootDraft.current = sess.draft;
      setDraft(sess.draft);
      const d = sess.draft?.templateId ? getDesign(sess.draft.templateId) : undefined;
      if (d) setChip(d.occasion);
      const q = new URLSearchParams(window.location.search);
      const want = q.get("d");
      if (q.get("s") === "orders") setStack([{ name: "catalog" }, { name: "orders" }]);
      else if (want && getDesign(want)) setStack([{ name: "catalog" }, { name: "view", id: want }]);
      setPhase("ready");
    } catch (e) {
      setOffline(e instanceof ApiError && e.code === "offline");
      setPhase(e instanceof ApiError && e.code === "auth" ? "noTelegram" : "error");
    }
  }, []);
  useEffect(() => {
    const id = setTimeout(boot, 0);
    return () => clearTimeout(id);
  }, [boot]);

  // ── Навигация ──
  const go = useCallback((sc: Screen) => {
    setBigPreview(false);
    // Двойное нажатие не кладёт тот же экран в историю дважды (иначе «назад» нужно жать два раза)
    setStack((st) => (JSON.stringify(st[st.length - 1]) === JSON.stringify(sc) ? st : [...st, sc]));
    window.scrollTo({ top: 0 });
  }, []);
  // Правка из итога/проверки: «назад» без «Сақлаш» возвращает данные как были (итог = НАМУНА)
  const editSnapshot = useRef<AppDraft | null>(null);
  const back = useCallback(() => {
    setBigPreview(false);
    if (screen.name === "form" && screen.ret && editSnapshot.current) {
      setDraft(editSnapshot.current);
      setErrors([]);
      editSnapshot.current = null;
    }
    setStack((st) => (st.length > 1 ? st.slice(0, -1) : st));
    window.scrollTo({ top: 0 });
  }, [screen]);
  const reset = useCallback((list: Screen[]) => {
    setBigPreview(false);
    setStack(list);
    window.scrollTo({ top: 0 });
  }, []);
  useBackButton(stack.length > 1 || !!viewer || bigPreview || help, () =>
    help ? setHelp(false) : bigPreview ? setBigPreview(false) : viewer ? setViewer(null) : back(),
  );

  // ── Черновик: сохраняем на сервере с задержкой ──
  // Черновик с сервера (при запуске) не отправляем обратно; всё, что клиент поменял после, — сохраняем.
  // Закрыл приложение раньше, чем прошла задержка, — сохранение уходит сразу (keepalive), чтобы
  // при следующем открытии сверху была карточка «Тугалланмаган таклифнома» с этими данными
  const bootDraft = useRef<AppDraft | null>(null);
  const unsaved = useRef<AppDraft | null>(null);
  useEffect(() => {
    if (phase !== "ready" || !draft || draft === bootDraft.current) return;
    unsaved.current = draft;
    const id = setTimeout(() => {
      unsaved.current = null;
      api("draft", { draft }).catch(() => undefined);
    }, SAVE_DELAY);
    return () => clearTimeout(id);
  }, [draft, phase]);
  useEffect(() => {
    const flush = (e: Event) => {
      const d = unsaved.current;
      if (!d || (e.type === "visibilitychange" && document.visibilityState !== "hidden")) return;
      unsaved.current = null;
      try {
        void fetch("/api/app", {
          method: "POST",
          keepalive: true,
          headers: { "content-type": "application/json", "x-tg-init-data": initDataOf() },
          body: JSON.stringify({ action: "draft", draft: d }),
        }).catch(() => undefined);
      } catch {
        /* нет сети — черновик останется до следующего изменения */
      }
    };
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("pagehide", flush);
    };
  }, []);

  // ── Заказ (НАМУНА): создать или обновить ту же ссылку ──
  const upsertOrder = useCallback((o: AppOrder) => {
    setOrders((list) => [o, ...list.filter((x) => x.id !== o.id)]);
    setDraft((d) => (d ? { ...d, orderId: o.id } : d));
  }, []);

  const submit = useCallback(
    async (d: AppDraft): Promise<AppOrder | null> => {
      try {
        const r = await api<SubmitResult>("submit", { draft: d });
        if ("ok" in r) {
          upsertOrder(r.order);
          setErrors([]);
          return r.order;
        }
        if (r.error === "fields") {
          setErrors(r.fields);
          haptic.error();
          // Остаёмся на анкете или открываем её поверх (назад — туда, откуда пришли)
          setStack((st) => (st[st.length - 1].name === "form" ? st : [...st, { name: "form", ret: true }]));
          setToast(T.form.errors.fix);
          return null;
        }
        if (r.error === "textLong") {
          // Свой текст длинный: остаёмся на итоге, под полем видно «N / 600»
          haptic.error();
          setToast(T.summary.ownTextLong(r.max));
          return null;
        }
        if (r.error === "closed" || r.error === "waiting") {
          setToast(r.error === "waiting" ? T.pay.errors.waiting : T.orders.closedEdit);
          reset([{ name: "catalog" }, { name: "orders" }]);
          return null;
        }
        setToast(T.serverError);
        return null;
      } catch (e) {
        setToast(e instanceof ApiError && e.code === "offline" ? T.offline : T.serverError);
        return null;
      }
    },
    [T, reset, upsertOrder],
  );

  // Правки на итоговом экране обновляют ту же ссылку (с задержкой, без лишних запросов)
  const resubmit = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Promise<unknown> | null>(null);
  const scheduleResubmit = useCallback(
    (d: AppDraft) => {
      if (!d.orderId) return;
      setSaveStatus(T.summary.saving);
      if (resubmit.current) clearTimeout(resubmit.current);
      resubmit.current = setTimeout(() => {
        resubmit.current = null;
        pending.current = submit(d).then((o) => setSaveStatus(o ? T.summary.saved : ""));
      }, RESUBMIT_DELAY);
    },
    [T, submit],
  );

  const patchDraft = (patch: Partial<AppDraft>, resend = false) => {
    setDraft((d) => {
      const next = { ...(d ?? {}), ...patch };
      if (resend) scheduleResubmit(next);
      return next;
    });
  };

  // ── Действия экранов ──
  async function toggleFavorite(id: string, on: boolean) {
    setFavorites((f) => (on ? [id, ...f.filter((x) => x !== id)] : f.filter((x) => x !== id)));
    setToast(on ? T.catalog.saved : T.catalog.removed);
    try {
      const r = await api<{ favorites: string[] }>("favorite", { templateId: id, saved: on });
      if (r.favorites) setFavorites(r.favorites);
    } catch {
      setToast(T.serverError);
    }
  }

  function choose(id: string) {
    const next = getDesign(id);
    if (!next) return;
    haptic.ok();
    const same = draft && design && design.occasion === next.occasion;
    setDraft(
      same
        ? { ...draft, templateId: id }
        : { templateId: id, form: emptyForm(next.occasion), rsvp: true, draftId: newDraftId() },
    );
    setErrors([]);
    // Назад с анкеты — к просмотру дизайна
    go({ name: "form" });
  }

  // После первой попытки ошибки пересчитываются на ходу: исправил — красное сразу уходит
  function changeForm(form: FormInput) {
    patchDraft({ form });
    if (errors.length && design) {
      const v = validateForm(design.occasion, form, session?.today ?? "");
      setErrors("errors" in v ? v.errors : []);
    }
  }

  async function formNext() {
    if (!design || !draft || busy) return;
    const v = validateForm(design.occasion, draft.form ?? {}, session?.today ?? "");
    if ("errors" in v) {
      setErrors(v.errors);
      haptic.error();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setErrors([]);
    setBusy(true);
    const o = await submit(draft);
    setBusy(false);
    if (!o) return;
    haptic.ok();
    // Правка из итога/проверки: НАМУНА обновлена (та же ссылка) — возвращаемся туда
    if (screen.name === "form" && screen.ret) {
      editSnapshot.current = null;
      return back();
    }
    go(design.clientPhotos ? { name: "photos" } : { name: "summary" });
  }

  async function toSummary() {
    if (!draft || busy || photosBusy) return;
    setBusy(true);
    await submit(draft);
    setBusy(false);
    go({ name: "summary" });
  }

  async function toPay() {
    if (!draft || busy) return;
    setBusy(true);
    if (resubmit.current) clearTimeout(resubmit.current);
    await pending.current;
    const o = await submit(draft);
    setBusy(false);
    if (o) go({ name: "pay", orderId: o.id, step: "check" });
  }

  /** «✏️ Маълумотларни ўзгартириш» на итоге и на проверке перед оплатой: анкета с текущими данными поверх */
  async function editData(o?: AppOrder) {
    if (busy) return;
    haptic.tap();
    if (!o || draft?.orderId === o.id) {
      editSnapshot.current = draft;
      return go({ name: "form", ret: true });
    }
    setBusy(true);
    try {
      const r = await api<{ draft?: AppDraft; error?: string }>("edit", { orderId: o.id });
      if (!r.draft) return setToast(T.orders.closedEdit);
      setDraft(r.draft);
      setErrors([]);
      editSnapshot.current = r.draft;
      go({ name: "form", ret: true });
    } catch {
      setToast(T.serverError);
    } finally {
      setBusy(false);
    }
  }

  async function editOrder(o: AppOrder) {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api<{ draft?: AppDraft; error?: string }>("edit", { orderId: o.id });
      if (!r.draft) return setToast(T.orders.closedEdit);
      setDraft(r.draft);
      setErrors([]);
      const d = getDesign(r.draft.templateId ?? "");
      if (d) setChip(d.occasion);
      // Назад с анкеты — в «Менинг таклифномаларим»
      go({ name: "form" });
    } catch {
      setToast(T.serverError);
    } finally {
      setBusy(false);
    }
  }

  async function newOne() {
    if (busy) return;
    setBusy(true);
    try {
      await api("new");
    } catch {
      /* черновик просто начнём заново на телефоне */
    }
    setBusy(false);
    setDraft(null);
    setErrors([]);
    reset([{ name: "catalog" }]);
  }

  /** «Бекор қилиш»: заказ (или черновик без заказа) удаляется на сервере с личными данными */
  async function cancelOrder(o: AppOrder | null): Promise<boolean> {
    try {
      const r = await api<{ ok?: true; error?: string }>("cancel", o ? { orderId: o.id } : {});
      if (!r.ok) {
        setToast(r.error === "waiting" ? T.pay.errors.waiting : T.orders.closedEdit);
        if (o) refreshOrders();
        return false;
      }
      haptic.ok();
      // Отложенное «обновить НАМУНА» отменённого черновика больше не отправляем
      if (resubmit.current) clearTimeout(resubmit.current);
      resubmit.current = null;
      unsaved.current = null;
      setSaveStatus("");
      if (o) setOrders((l) => l.filter((x) => x.id !== o.id));
      // Плашка без заказа, а сервер отменил и привязанный заказ — список «Менинг таклифномаларим» сверяем сразу
      else void refreshOrders();
      if (!o || draft?.orderId === o.id) {
        setDraft(null);
        setErrors([]);
      }
      setToast(T.orders.cancelled);
      return true;
    } catch (e) {
      setToast(e instanceof ApiError && e.code === "offline" ? T.offline : T.serverError);
      return false;
    }
  }

  async function changeLang(l: Lang) {
    if (l === lang) return;
    haptic.select();
    setLang(l);
    api("lang", { lang: l }).catch(() => undefined);
  }

  // Ожидание чека и «Мои»: статус с сервера — раз в 7 с на экране ожидания и при каждом возвращении в приложение
  const refreshOrders = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const r = await api<{ orders?: AppOrder[] }>("orders");
      if (r.orders) setOrders(r.orders);
    } catch {
      /* нет сети — спросим в следующий раз */
    }
  }, []);
  useEffect(() => {
    if (phase !== "ready" || (screen.name !== "wait" && screen.name !== "orders")) return;
    const id = screen.name === "wait" ? setInterval(refreshOrders, POLL_MS) : undefined;
    document.addEventListener("visibilitychange", refreshOrders);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", refreshOrders);
    };
  }, [phase, screen.name, refreshOrders]);
  const waitOrder = screen.name === "wait" ? orders.find((o) => o.id === screen.orderId) : undefined;
  useEffect(() => {
    if (waitOrder?.status === "active") haptic.ok();
    else if (waitOrder?.status === "rejected") haptic.error();
  }, [waitOrder?.status]);

  // Мелодии тадбира — когда дошли до итога
  useEffect(() => {
    if (screen.name !== "summary" || !design) return;
    let alive = true;
    api<{ tracks?: Track[]; others?: Track[] }>("music", { templateId: design.id, lang })
      .then((r) => {
        if (!alive) return;
        setTracks(r.tracks ?? []);
        setOtherTracks(r.others ?? []);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [screen.name, design, lang]);

  const extras = useMemo(
    () => ({ photos: draft?.photos, textId: draft?.textId, customText: draft?.customText, rsvp: draft?.rsvp }),
    [draft?.photos, draft?.textId, draft?.customText, draft?.rsvp],
  );
  const summaryData = useMemo(
    () => (design && draft ? previewData(design.sample, draft.form, extras) : null),
    [design, draft, extras],
  );
  const price = order?.amount ?? (design ? PRICES[design.format] : 0);
  // Акция для этого покупателя (сервер шлёт только обычному клиенту); закончилась — исчезает сама
  const { promotion } = useLivePromotion(session?.promotion);
  // Ожидаемая цена до перехода к оплате: акция или оптовая скидка (точную фиксирует сервер на шаге оплаты)
  const deal = design
    ? (dealPrice(promotion, design, PRICES[design.format]) ??
      (session?.wholesalePercent ? discounted(PRICES[design.format], session.wholesalePercent) : null))
    : null;
  const shownPrice = design && deal !== null && (!order || order.amount === PRICES[design.format]) ? deal : price;

  // Своя кнопка внизу страницы видна (native MainButton не показана, а у экрана есть главное действие)
  const ownBar = !nativeMain && phase === "ready" && !viewer && !bigPreview && !help && MAIN_SCREENS.has(screen.name);

  // ── Главная кнопка экрана ──
  let main: { text: string | null; onClick: () => void; progress?: boolean } = { text: null, onClick: () => undefined };
  if (phase === "ready") {
    switch (screen.name) {
      case "view":
        main = { text: T.view.choose, onClick: () => choose(screen.id) };
        break;
      case "form":
        main = { text: screen.ret ? T.form.saveBack : T.form.next, onClick: formNext, progress: busy };
        break;
      case "photos":
        main = {
          text: draft?.photos?.length ? T.photos.next : T.photos.skip,
          onClick: toSummary,
          progress: busy || photosBusy > 0,
        };
        break;
      case "summary":
        main = { text: T.summary.pay(shownPrice), onClick: toPay, progress: busy };
        break;
      case "wait":
        main =
          waitOrder?.status === "rejected"
            ? { text: null, onClick: () => undefined }
            : { text: T.myOrders, onClick: () => reset([{ name: "catalog" }, { name: "orders" }]) };
        break;
      case "orders":
        main = { text: T.orders.newOne, onClick: newOne, progress: busy };
        break;
    }
  }
  if (viewer || bigPreview || help) main = { text: null, onClick: () => undefined };

  const resume =
    draft?.templateId && design && screen.name === "catalog"
      ? {
          title: `${T.occasions[design.occasion]} · ${namesOf(draft) || T.catalog.continueTitle}`,
          cover: thumbOf(design.cover),
          onResume: () => go(order ? { name: "summary" } : { name: "form" }),
          onCancel: () => cancelOrder(order ?? (draft.orderId ? ({ id: draft.orderId } as AppOrder) : null)),
        }
      : null;

  return (
    <TextsContext.Provider value={T}>
      <div
        data-app-root
        className={`${s.root} ${ownBar ? "" : s.nativeMain} ${fontClass}`}
        lang={lang === "ru" ? "ru" : lang === "kk" ? "kk" : "uz-Cyrl"}
      >
        {phase === "ready" && screen.name !== "view" && (
          <header className={s.header}>
            <div className={s.headerRow}>
              {!insideTelegram() && stack.length > 1 && (
                <button type="button" className={s.iconBtn} onClick={back} aria-label={T.back}>
                  <BackIcon />
                </button>
              )}
              <span className={s.brand}>
                Invite<b>IZI</b>
              </span>
              <button
                type="button"
                className={s.iconBtn}
                onClick={() => {
                  haptic.tap();
                  setHelp(true);
                }}
                aria-label={T.help}
                data-help-btn
              >
                <HelpIcon />
              </button>
              <button
                type="button"
                className={s.iconBtn}
                onClick={() => (screen.name === "orders" ? undefined : go({ name: "orders" }))}
                aria-label={T.myOrders}
                aria-pressed={screen.name === "orders"}
              >
                <FolderIcon />
              </button>
              <span className={s.langs} role="group" aria-label="Тил / Язык / Тіл">
                {(["uz", "ru", ...(session?.extraLangs?.includes("kk") ? ["kk"] : [])] as Lang[]).map((l) => (
                  <button key={l} type="button" aria-pressed={lang === l} onClick={() => changeLang(l)}>
                    {T.langSwitch[l]}
                  </button>
                ))}
              </span>
            </div>
          </header>
        )}

        <main className={s.wrap}>
          {phase === "boot" && <Boot slow={slow} onRetry={() => window.location.reload()} />}
          {phase === "noTelegram" && <p className={s.center}>{T.openInTelegram}</p>}
          {phase === "error" && (
            <div className={s.center}>
              <div>
                <p>{offline ? T.offline : T.serverError}</p>
                <button
                  type="button"
                  className={s.btn}
                  onClick={() => {
                    setSlow(false);
                    setPhase("boot");
                    boot();
                  }}
                >
                  {T.retry}
                </button>
              </div>
            </div>
          )}
          {phase === "ready" && session && (
            <>
              {screen.name === "catalog" && (
                <Catalog
                  chip={chip}
                  onChip={(c) => {
                    haptic.select();
                    setChip(c);
                  }}
                  favorites={favorites}
                  onFavorite={toggleFavorite}
                  onOpen={(d) => go({ name: "view", id: d.id })}
                  resume={resume}
                  promotion={session.promotion}
                />
              )}
              {screen.name === "form" && design && draft && (
                <Form
                  key={design.id}
                  design={design}
                  form={draft.form ?? emptyForm(design.occasion)}
                  extras={extras}
                  today={session.today}
                  errors={errors}
                  onChange={changeForm}
                  big={bigPreview}
                  onBig={setBigPreview}
                  onText={(t) => patchDraft(t)}
                />
              )}
              {screen.name === "photos" && draft && (
                <Photos
                  photos={draft.photos ?? []}
                  onChange={(photos) => patchDraft({ photos })}
                  onToast={setToast}
                  onPending={setPhotosBusy}
                />
              )}
              {screen.name === "summary" && draft && summaryData && (
                <Summary
                  data={summaryData}
                  textId={draft.textId}
                  customText={draft.customText}
                  music={draft.music}
                  rsvp={draft.rsvp !== false}
                  langs={draft.langs ?? []}
                  customTexts={draft.customTexts ?? {}}
                  extraLangs={session.extraLangs ?? ["ru"]}
                  mainLang={draft.mainLang}
                  demoUrl={draft.templateId ? `/demo/${draft.templateId}` : null}
                  onExample={(url) => setViewer(url)}
                  tracks={tracks}
                  others={otherTracks}
                  price={price}
                  deal={deal === null || !design ? null : { base: PRICES[design.format], price: deal }}
                  namunaUrl={order?.url ?? null}
                  status={saveStatus}
                  onChange={(patch) => patchDraft(patch, true)}
                  onNamuna={() => order && setViewer(order.url)}
                  onEdit={() => editData()}
                />
              )}
              {screen.name === "pay" &&
                (() => {
                  const o = orders.find((x) => x.id === screen.orderId);
                  return o ? (
                    <Pay
                      key={screen.step}
                      order={o}
                      step={screen.step}
                      staff={Boolean(session.staff)}
                      onIssued={(c) => {
                        setOrders((l) => l.map((x) => (x.id === c.id ? c : x)));
                        setDraft(null);
                        reset([{ name: "catalog" }, { name: "wait", orderId: c.id, night: false }]);
                      }}
                      onConfirmed={(c) => {
                        setOrders((l) => l.map((x) => (x.id === c.id ? c : x)));
                        go({ name: "pay", orderId: o.id, step: "pay" });
                      }}
                      onEdit={editData}
                      busy={busy}
                      pay={session.pay}
                      onToast={setToast}
                      onTerms={() => setViewer(lang === "uz" ? "/terms" : "/terms/ru")}
                      onDone={(night) => {
                        setOrders((l) =>
                          l.map((x) =>
                            x.id === o.id ? { ...x, status: "receipt_sent", canPay: false, canEdit: false } : x,
                          ),
                        );
                        setDraft(null);
                        reset([{ name: "catalog" }, { name: "wait", orderId: o.id, night }]);
                      }}
                    />
                  ) : null;
                })()}
              {screen.name === "wait" && waitOrder && (
                <Waiting
                  order={waitOrder}
                  night={screen.night}
                  onToast={setToast}
                  onResend={() =>
                    reset([
                      { name: "catalog" },
                      { name: "orders" },
                      { name: "pay", orderId: waitOrder.id, step: waitOrder.confirmed ? "pay" : "check" },
                    ])
                  }
                />
              )}
              {screen.name === "orders" && (
                <Orders
                  orders={orders}
                  onEdit={editOrder}
                  onPay={(o) => go({ name: "pay", orderId: o.id, step: o.confirmed ? "pay" : "check" })}
                  onStatus={(o) => go({ name: "wait", orderId: o.id, night: isQuiet(new Date()) })}
                  onCancel={cancelOrder}
                  onToast={setToast}
                  busy={busy}
                />
              )}
            </>
          )}
        </main>

        {phase === "ready" && screen.name === "view" && (
          <div className={s.viewer}>
            <div className={s.viewerTop}>
              <button type="button" className={s.backPill} onClick={back}>
                <BackIcon size={18} />
                {T.view.back}
              </button>
              <Heart
                on={favorites.includes(screen.id)}
                onToggle={() => toggleFavorite(screen.id, !favorites.includes(screen.id))}
              />
            </div>
            {(() => {
              const d = getDesign(screen.id);
              const v = d ? dealPrice(promotion, d, PRICES[d.format]) : null;
              return d && v !== null ? (
                <div className={s.viewerDealRow} data-view-deal>
                  <span className={s.viewerDeal}>
                    <DealPrice base={PRICES[d.format]} deal={v} />
                  </span>
                </div>
              ) : null;
            })()}
            <iframe src={`/demo/${screen.id}`} title={screen.id} allow="autoplay; fullscreen" />
            {!nativeMain && <div className={s.viewerBottom} aria-hidden="true" />}
          </div>
        )}
        {viewer && (
          <div className={s.viewer} role="dialog" aria-modal="true">
            <div className={s.viewerTop}>
              <button type="button" className={s.backPill} onClick={() => setViewer(null)}>
                <CloseIcon size={18} />
                {T.form.previewClose}
              </button>
            </div>
            <iframe src={viewer} title="НАМУНА" allow="autoplay; fullscreen" />
          </div>
        )}

        {help && session && (
          <Help
            contact={session.contact}
            onClose={() => setHelp(false)}
            onTerms={() => {
              setHelp(false);
              setViewer(lang === "uz" ? "/terms" : "/terms/ru");
            }}
          />
        )}
        <MainAction text={main.text} onClick={main.onClick} progress={main.progress} />
        <Toast text={toast} onDone={() => setToast(null)} />
      </div>
    </TextsContext.Provider>
  );
}
