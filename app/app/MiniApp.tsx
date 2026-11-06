"use client";
/**
 * Mini App InviteIZI: каталог → просмотр → анкета с живым превью → фото → «Бот танлади» → оплата → мои заказы.
 * Черновик сохраняется на сервере (закрыл — открыл — продолжает), заказ — тот же, что видит чат.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppDraft, AppOrder, AppSession, SubmitResult } from "@/bot/app/service";
import type { Lang } from "@/lib/domain";
import { validateForm, type FieldError, type FormInput } from "@/lib/order-rules";
import { previewData } from "@/lib/preview-data";
import { getDesign, PRICES, type Design } from "@/templates/registry";
import { appUz } from "@/texts/app-uz";
import { appRu } from "@/texts/app-ru";
import { appKk } from "@/texts/app-kk";
import { api, ApiError } from "./ui/api";
import { Catalog, Heart, type Chip } from "./ui/Catalog";
import { emptyForm, Form } from "./ui/Form";
import { Photos } from "./ui/Photos";
import { Summary, type Track } from "./ui/Summary";
import { Pay, Waiting } from "./ui/Pay";
import { isQuiet } from "@/lib/quiet-hours";
import { Orders } from "./ui/Orders";
import { MainAction, TextsContext, Toast } from "./ui/shared";
import { haptic, insideTelegram, setupTelegram, tg, useBackButton, useNativeMainVisible } from "./ui/telegram";
import s from "./app.module.css";

type Screen =
  | { name: "catalog" }
  | { name: "view"; id: string }
  | { name: "form" }
  | { name: "photos" }
  | { name: "summary" }
  | { name: "pay"; orderId: string }
  | { name: "wait"; orderId: string; night: boolean }
  | { name: "orders" };

type Phase = "boot" | "noTelegram" | "error" | "ready";
const SAVE_DELAY = 700;
/** Экраны с главной кнопкой (см. switch ниже) */
const MAIN_SCREENS = new Set<Screen["name"]>(["view", "form", "photos", "summary", "wait", "orders"]);
/** Экран ожидания проверки чека спрашивает статус так часто, пока открыт */
const POLL_MS = 7000;
const RESUBMIT_DELAY = 900;

function namesOf(d: AppDraft) {
  const f = d.form ?? {};
  return [f.groom, f.bride].filter(Boolean).join(" & ") || f.person || "";
}

export default function MiniApp({ fontClass }: { fontClass: string }) {
  const [phase, setPhase] = useState<Phase>("boot");
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
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [viewer, setViewer] = useState<string | null>(null);
  const [bigPreview, setBigPreview] = useState(false);
  const screen = stack[stack.length - 1];
  const nativeMain = useNativeMainVisible();
  const design: Design | undefined = draft?.templateId ? getDesign(draft.templateId) : undefined;
  const order = orders.find((o) => o.id === draft?.orderId) ?? null;

  // ── Запуск ──
  const boot = useCallback(async () => {
    // Скрипт Telegram грузится после страницы: ждём до 10 с (медленный интернет)
    for (let i = 0; i < 100 && !tg(); i++) await new Promise((r) => setTimeout(r, 100));
    setupTelegram();
    if (!tg()?.initData) return setPhase("noTelegram");
    try {
      const sess = await api<AppSession>("session");
      setSession(sess);
      setLang(sess.lang);
      setFavorites(sess.favorites);
      setOrders(sess.orders);
      setDraft(sess.draft);
      const d = sess.draft?.templateId ? getDesign(sess.draft.templateId) : undefined;
      if (d) setChip(d.occasion);
      const q = new URLSearchParams(window.location.search);
      const want = q.get("d");
      if (q.get("s") === "orders") setStack([{ name: "catalog" }, { name: "orders" }]);
      else if (want && getDesign(want)) setStack([{ name: "catalog" }, { name: "view", id: want }]);
      setPhase("ready");
    } catch (e) {
      setPhase(e instanceof ApiError && e.code === "auth" ? "noTelegram" : "error");
    }
  }, []);
  useEffect(() => {
    const id = setTimeout(boot, 0);
    return () => clearTimeout(id);
  }, [boot]);

  // ── Навигация ──
  const go = useCallback((sc: Screen) => {
    setStack((st) => [...st, sc]);
    window.scrollTo({ top: 0 });
  }, []);
  const back = useCallback(() => {
    setStack((st) => (st.length > 1 ? st.slice(0, -1) : st));
    window.scrollTo({ top: 0 });
  }, []);
  const reset = useCallback((list: Screen[]) => {
    setStack(list);
    window.scrollTo({ top: 0 });
  }, []);
  useBackButton(stack.length > 1 || !!viewer || bigPreview, () => (bigPreview ? setBigPreview(false) : viewer ? setViewer(null) : back()));
  // Ушли с анкеты — большое превью закрыто
  useEffect(() => {
    if (screen.name !== "form") setBigPreview(false);
  }, [screen.name]);

  // ── Черновик: сохраняем на сервере с задержкой ──
  const firstDraft = useRef(true);
  useEffect(() => {
    if (phase !== "ready" || !draft) return;
    if (firstDraft.current) {
      firstDraft.current = false;
      return;
    }
    const id = setTimeout(() => api("draft", { draft }).catch(() => undefined), SAVE_DELAY);
    return () => clearTimeout(id);
  }, [draft, phase]);

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
          reset([{ name: "catalog" }, { name: "form" }]);
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
    setDraft(same ? { ...draft, templateId: id } : { templateId: id, form: emptyForm(next.occasion), rsvp: true });
    setErrors([]);
    reset([{ name: "catalog" }, { name: "form" }]);
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
    go(design.clientPhotos ? { name: "photos" } : { name: "summary" });
  }

  async function toSummary() {
    if (!draft) return;
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
    if (o) go({ name: "pay", orderId: o.id });
  }

  async function editOrder(o: AppOrder) {
    try {
      const r = await api<{ draft?: AppDraft; error?: string }>("edit", { orderId: o.id });
      if (!r.draft) return setToast(T.orders.closedEdit);
      setDraft(r.draft);
      setErrors([]);
      const d = getDesign(r.draft.templateId ?? "");
      if (d) setChip(d.occasion);
      reset([{ name: "catalog" }, { name: "form" }]);
    } catch {
      setToast(T.serverError);
    }
  }

  async function newOne() {
    try {
      await api("new");
    } catch {
      /* черновик просто начнём заново на телефоне */
    }
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
      if (o) setOrders((l) => l.filter((x) => x.id !== o.id));
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
    api<{ tracks?: Track[] }>("music", { templateId: design.id, lang })
      .then((r) => alive && setTracks(r.tracks ?? []))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [screen.name, design, lang]);

  const extras = useMemo(() => ({ photos: draft?.photos, textId: draft?.textId, customText: draft?.customText, rsvp: draft?.rsvp }), [draft?.photos, draft?.textId, draft?.customText, draft?.rsvp]);
  const summaryData = useMemo(() => (design && draft ? previewData(design.sample, draft.form, extras) : null), [design, draft, extras]);
  const price = order?.amount ?? (design ? PRICES[design.format] : 0);

  // Своя кнопка внизу страницы видна (native MainButton не показана, а у экрана есть главное действие)
  const ownBar = !nativeMain && phase === "ready" && !viewer && !bigPreview && MAIN_SCREENS.has(screen.name);

  // ── Главная кнопка экрана ──
  let main: { text: string | null; onClick: () => void; progress?: boolean } = { text: null, onClick: () => undefined };
  if (phase === "ready") {
    switch (screen.name) {
      case "view":
        main = { text: T.view.choose, onClick: () => choose(screen.id) };
        break;
      case "form":
        main = { text: T.form.next, onClick: formNext, progress: busy };
        break;
      case "photos":
        main = { text: draft?.photos?.length ? T.photos.next : T.photos.skip, onClick: toSummary, progress: busy };
        break;
      case "summary":
        main = { text: T.summary.pay(price), onClick: toPay, progress: busy };
        break;
      case "wait":
        main = waitOrder?.status === "rejected" ? { text: null, onClick: () => undefined } : { text: T.myOrders, onClick: () => reset([{ name: "catalog" }, { name: "orders" }]) };
        break;
      case "orders":
        main = { text: T.orders.newOne, onClick: newOne };
        break;
    }
  }
  if (viewer || bigPreview) main = { text: null, onClick: () => undefined };

  const resume =
    draft?.templateId && design && screen.name === "catalog"
      ? { title: `${T.occasions[design.occasion]} · ${namesOf(draft) || T.catalog.continueTitle}`, onResume: () => go(draft.orderId ? { name: "summary" } : { name: "form" }), onCancel: () => cancelOrder(order) }
      : null;

  return (
    <TextsContext.Provider value={T}>
      <div data-app-root className={`${s.root} ${ownBar ? "" : s.nativeMain} ${fontClass}`} lang={lang === "ru" ? "ru" : lang === "kk" ? "kk" : "uz-Cyrl"}>
        {phase === "ready" && screen.name !== "view" && (
          <header className={s.header}>
            <div className={s.headerRow}>
              {!insideTelegram() && stack.length > 1 && (
                <button type="button" className={s.iconBtn} onClick={back} aria-label={T.back}>
                  ◀
                </button>
              )}
              <span className={s.brand}>
                Invite<b>IZI</b>
              </span>
              <button type="button" className={s.iconBtn} onClick={() => (screen.name === "orders" ? undefined : go({ name: "orders" }))} aria-label={T.myOrders}>
                📂
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
          {phase === "boot" && <p className={s.center}>{T.loading}</p>}
          {phase === "noTelegram" && <p className={s.center}>{T.openInTelegram}</p>}
          {phase === "error" && (
            <div className={s.center}>
              <div>
                <p>{T.serverError}</p>
                <button type="button" className={s.btn} onClick={() => { setPhase("boot"); boot(); }}>
                  {T.retry}
                </button>
              </div>
            </div>
          )}
          {phase === "ready" && session && (
            <>
              {screen.name === "catalog" && (
                <Catalog chip={chip} onChip={(c) => { haptic.select(); setChip(c); }} favorites={favorites} onFavorite={toggleFavorite} onOpen={(d) => go({ name: "view", id: d.id })} resume={resume} />
              )}
              {screen.name === "form" && design && draft && (
                <Form key={design.id} design={design} form={draft.form ?? emptyForm(design.occasion)} extras={extras} today={session.today} errors={errors} onChange={changeForm} big={bigPreview} onBig={setBigPreview} />
              )}
              {screen.name === "photos" && draft && (
                <Photos photos={draft.photos ?? []} onChange={(photos) => patchDraft({ photos })} onToast={setToast} />
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
                  price={price}
                  namunaUrl={order?.url ?? null}
                  status={saveStatus}
                  onChange={(patch) => patchDraft(patch, true)}
                  onNamuna={() => order && setViewer(order.url)}
                />
              )}
              {screen.name === "pay" && (() => {
                const o = orders.find((x) => x.id === screen.orderId);
                return o ? <Pay order={o} pay={session.pay} onToast={setToast} onDone={(night) => { setOrders((l) => l.map((x) => (x.id === o.id ? { ...x, status: "receipt_sent", canPay: false, canEdit: false } : x))); setDraft(null); reset([{ name: "catalog" }, { name: "wait", orderId: o.id, night }]); }} /> : null;
              })()}
              {screen.name === "wait" && waitOrder && <Waiting order={waitOrder} night={screen.night} onToast={setToast} onResend={() => reset([{ name: "catalog" }, { name: "orders" }, { name: "pay", orderId: waitOrder.id }])} />}
              {screen.name === "orders" && <Orders orders={orders} onEdit={editOrder} onPay={(o) => go({ name: "pay", orderId: o.id })} onStatus={(o) => go({ name: "wait", orderId: o.id, night: isQuiet(new Date()) })} onCancel={cancelOrder} onToast={setToast} />}
            </>
          )}
        </main>

        {phase === "ready" && screen.name === "view" && (
          <div className={s.viewer}>
            <div className={s.viewerTop}>
              <button type="button" className={s.backPill} onClick={back}>
                {T.view.back}
              </button>
              <Heart on={favorites.includes(screen.id)} onToggle={() => toggleFavorite(screen.id, !favorites.includes(screen.id))} />
            </div>
            <iframe src={`/demo/${screen.id}`} title={screen.id} />
            {!nativeMain && <div className={s.viewerBottom} aria-hidden="true" />}
          </div>
        )}
        {viewer && (
          <div className={s.viewer} role="dialog" aria-modal="true">
            <div className={s.viewerTop}>
              <button type="button" className={s.backPill} onClick={() => setViewer(null)}>
                ✕ {T.form.previewClose}
              </button>
            </div>
            <iframe src={viewer} title="НАМУНА" />
          </div>
        )}

        <MainAction text={main.text} onClick={main.onClick} progress={main.progress} />
        <Toast text={toast} onDone={() => setToast(null)} />
      </div>
    </TextsContext.Provider>
  );
}
