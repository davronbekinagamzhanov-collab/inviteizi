"use client";
/** Оплата: сумма, реквизиты Kaspi с «Нусха олиш», чек — прямо здесь. Потом «Чек қабул қилинди ✅» */
import { useEffect, useRef, useState } from "react";
import type { AppOrder, ReceiptResult } from "@/bot/app/service";
import { api, ApiError, MAX_FILE, MAX_RAW_UPLOAD, shrinkImage, upload } from "./api";
import { Section, useT } from "./shared";
import { STAFF_GRANT_REASONS, type StaffGrantReason } from "@/lib/types";
import { copyText, haptic, openLink, shareLink } from "./telegram";
import { CheckIcon, ClockIcon, CloseIcon, SpinnerIcon } from "./icons";
import { PriceBlock, PromoField } from "./PriceBlock";
import { salesCopy } from "@/texts/sales";
import { payCopy } from "@/texts/pay";
import s from "../app.module.css";

type PayInfo = { phone: string; name: string; card: string | null };

export function Pay({
  order: initial,
  step,
  pay,
  onDone,
  onToast,
  onTerms,
  onConfirmed,
  onEdit,
  busy: editBusy,
  staff = false,
  onIssued,
}: {
  order: AppOrder;
  step: "check" | "pay";
  pay: PayInfo;
  onDone: (night: boolean) => void;
  onToast: (t: string) => void;
  onTerms: () => void;
  onConfirmed: (o: AppOrder) => void;
  onEdit: (o: AppOrder) => void;
  busy?: boolean;
  staff?: boolean;
  onIssued?: (o: AppOrder) => void;
}) {
  const T = useT();
  // Цена фиксируется при переходе к оплате (акция / промокод / оптовая) — сервер отвечает суммой со скидкой
  const [order, setOrder] = useState<AppOrder>(initial);
  useEffect(() => {
    if (staff) return;
    let alive = true;
    api<{ ok: true; order: AppOrder } | { error: string }>("quote", { orderId: initial.id }).then(
      (r) => alive && "ok" in r && setOrder(r.order),
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [initial.id, staff]);
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Проверка перед оплатой: реквизиты — только после «✅ Ҳаммаси тўғри, тўлаймиз» (отдельный шаг: «назад» с реквизитов → проверка)
  // Акция закончилась до чека: снова проверка с новой суммой
  const [recheck, setRecheck] = useState(false);
  const confirmed = step === "pay" && !recheck;
  const [busy, setBusy] = useState(false);
  const [agree, setAgree] = useState(false);
  const [reason, setReason] = useState<StaffGrantReason | null>(null);
  const [clientLink, setClientLink] = useState<string | null>(null);
  // Оплата без чека: «✅ Тўладим» → имя, как в Kaspi
  const [asking, setAsking] = useState(false);
  const [payer, setPayer] = useState("");
  const [receiptOpen, setReceiptOpen] = useState(false);

  async function sendName() {
    if (busy) return;
    const pt = payCopy(T.lang);
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ ok: true; night: boolean } | { error: string }>("paidByName", {
        orderId: order.id,
        name: payer,
      });
      if ("ok" in r) {
        haptic.ok();
        onDone(r.night);
        return;
      }
      haptic.error();
      if (r.error === "priceChanged" || r.error === "notConfirmed") {
        const q = await api<{ ok: true; order: AppOrder } | { error: string }>("quote", { orderId: order.id });
        if ("ok" in q) setOrder(q.order);
        setAgree(false);
        setRecheck(true);
      }
      setError(r.error === "name" ? pt.nameBad : (T.pay.errors[r.error as keyof typeof T.pay.errors] ?? T.serverError));
    } catch (e) {
      haptic.error();
      setError(
        e instanceof ApiError && e.code === "tooOften"
          ? payCopy(T.lang).tooOften
          : e instanceof ApiError && e.code === "offline"
            ? T.offline
            : T.serverError,
      );
    } finally {
      setBusy(false);
    }
  }

  // Владелец заполнил за клиента: одноразовая ссылка o_ — заказ перейдёт к клиенту, оплатит он сам
  async function forClient() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ ok: true; bot: string } | { error: string }>("ownerClientLink", { orderId: order.id });
      if ("ok" in r) {
        haptic.ok();
        setClientLink(r.bot);
      } else setError(T.pay.free.failed);
    } catch (e) {
      haptic.error();
      setError(e instanceof ApiError && e.code === "offline" ? T.offline : T.pay.free.failed);
    } finally {
      setBusy(false);
    }
  }

  // Владелец: без Kaspi и чека — причина и «Бесплатно яратиш» (права ещё раз проверяет сервер)
  async function issueFree() {
    if (busy) return;
    if (!reason) {
      haptic.error();
      return setError(T.pay.free.pick);
    }
    setBusy(true);
    try {
      const r = await api<{ ok: true; order: AppOrder } | { error: string }>("freeIssue", {
        orderId: order.id,
        reason,
      });
      if ("ok" in r) {
        haptic.ok();
        onIssued?.(r.order);
      } else {
        haptic.error();
        setError(T.pay.free.failed);
      }
    } catch (e) {
      setError(e instanceof ApiError && e.code === "offline" ? T.offline : T.pay.free.failed);
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (busy) return;
    if (!agree) {
      haptic.error();
      return setError(T.pay.errors.terms);
    }
    setBusy(true);
    try {
      const r = await api<{ ok: true; order: AppOrder; free?: true } | { error: string; order?: AppOrder }>(
        "confirmPay",
        {
          orderId: order.id,
          terms: true,
        },
      );
      if ("ok" in r && r.free) {
        // 0 ₸ по акции: без Kaspi и чека — ссылка уже отправлена
        haptic.ok();
        onIssued?.(r.order);
      } else if ("ok" in r) {
        haptic.ok();
        setRecheck(false);
        if (r.order) setOrder(r.order);
        onConfirmed(r.order ?? { ...order, confirmed: true });
      } else {
        haptic.error();
        if (r.order) setOrder(r.order);
        setError(T.pay.errors[r.error as keyof typeof T.pay.errors] ?? T.serverError);
      }
    } catch (e) {
      setError(e instanceof ApiError && e.code === "offline" ? T.offline : T.serverError);
    } finally {
      setBusy(false);
    }
  }

  async function copy(v: string) {
    if (await copyText(v.replace(/\s+/g, ""))) {
      haptic.ok();
      onToast(T.pay.copied);
    }
  }

  async function send(file: File | undefined) {
    if (!file || progress !== null) return;
    setError(null);
    // Лимит — на то, что уйдёт на сервер: фото ужмём на телефоне, PDF — как есть (тело запроса ≤ 4,3 МБ)
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (file.size > (isPdf ? MAX_RAW_UPLOAD : MAX_FILE)) return setError(T.pay.errors.tooBig);
    setProgress(0);
    try {
      const body = isPdf ? { blob: file as Blob, name: file.name || "chek.pdf" } : await shrinkImage(file);
      const r = await upload<ReceiptResult>("receipt", body.blob, body.name, { order: order.id }, setProgress);
      if ("ok" in r) {
        haptic.ok();
        onDone(r.night);
      } else {
        haptic.error();
        if (r.error === "priceChanged") {
          const q = await api<{ ok: true; order: AppOrder } | { error: string }>("quote", { orderId: order.id });
          if ("ok" in q) setOrder(q.order);
          setAgree(false);
          setRecheck(true);
        }
        setError(T.pay.errors[r.error] ?? T.serverError);
      }
    } catch (e) {
      haptic.error();
      const code = e instanceof ApiError ? e.code : "server";
      setError(
        code === "tooBig"
          ? T.pay.errors.tooBig
          : code === "format"
            ? T.pay.errors.format
            : code === "offline"
              ? T.offline
              : T.serverError,
      );
    } finally {
      setProgress(null);
      if (input.current) input.current.value = "";
    }
  }

  if (staff) {
    return (
      <div className={s.screen} data-staff-free>
        <h1 className={s.title}>{T.pay.free.title}</h1>
        <Section title={order.title}>
          <p className={s.label} style={{ whiteSpace: "pre-line" }}>
            {(order.check ?? "")
              .split("\n")
              .slice(1)
              .filter((l) => !l.startsWith("💳"))
              .join("\n")}
          </p>
          {order.namunaOpen !== false && (
            <a className={`${s.btn} ${s.btnGhost} ${s.btnSmall}`} href={order.url} target="_blank" rel="noopener">
              {T.pay.checkOpen}
            </a>
          )}
          <button
            type="button"
            className={`${s.btn} ${s.btnGhost} ${s.btnWide} ${s.btnEdit}`}
            onClick={() => onEdit(order)}
            disabled={editBusy}
            aria-busy={editBusy}
            data-edit-data
          >
            {T.form.editData}
          </button>
        </Section>
        <p className={s.help}>{T.pay.free.lead}</p>
        <div
          className={s.chips}
          style={{ flexWrap: "wrap", overflow: "visible" }}
          role="radiogroup"
          aria-label={T.pay.free.pick}
        >
          {STAFF_GRANT_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={reason === r}
              className={`${s.btn} ${reason === r ? "" : s.btnGhost} ${s.btnSmall}`}
              onClick={() => {
                haptic.select();
                setReason(r);
                setError(null);
              }}
            >
              {T.pay.free.reasons[r]}
            </button>
          ))}
        </div>
        {error && (
          <p className={s.formErr} role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          className={`${s.btn} ${s.btnWide}`}
          onClick={issueFree}
          disabled={busy || !reason}
          aria-busy={busy}
          data-free-issue
        >
          {busy ? <SpinnerIcon size={20} /> : null}
          {T.pay.free.create}
        </button>
        <p className={s.help}>{T.pay.free.forClientLead}</p>
        {clientLink ? (
          <div data-client-link>
            <p className={s.label} style={{ overflowWrap: "anywhere" }}>
              {clientLink}
            </p>
            <button
              type="button"
              className={`${s.btn} ${s.btnGhost} ${s.btnWide}`}
              onClick={async () => {
                if (await copyText(clientLink)) {
                  haptic.ok();
                  onToast(T.pay.copied);
                }
              }}
            >
              {T.pay.free.forClientCopy}
            </button>
            <button
              type="button"
              className={`${s.btn} ${s.btnGhost} ${s.btnWide}`}
              onClick={() => shareLink(clientLink, order.title)}
            >
              {T.pay.free.forClientShare}
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={`${s.btn} ${s.btnGhost} ${s.btnWide}`}
            onClick={forClient}
            disabled={busy}
            data-for-client
          >
            {T.pay.free.forClient}
          </button>
        )}
      </div>
    );
  }

  if (!confirmed) {
    return (
      <div className={s.screen}>
        <h1 className={s.title}>{T.pay.checkTitle}</h1>
        <Section title={order.title}>
          {/* pre-line: каждый тадбир с новой строки (раньше склеивались в один абзац) */}
          <p className={s.label} style={{ whiteSpace: "pre-line" }}>
            {(order.check ?? "")
              .split("\n")
              .slice(1)
              .filter((l) => !l.startsWith("💳"))
              .join("\n")}
          </p>
          {order.namunaOpen !== false ? (
            <a className={`${s.btn} ${s.btnGhost} ${s.btnSmall}`} href={order.url} target="_blank" rel="noopener">
              {T.pay.checkOpen}
            </a>
          ) : (
            <p className={s.help}>{T.pay.namunaClosed}</p>
          )}
          <button
            type="button"
            className={`${s.btn} ${s.btnGhost} ${s.btnWide} ${s.btnEdit}`}
            onClick={() => onEdit(order)}
            disabled={editBusy}
            aria-busy={editBusy}
            data-edit-data
          >
            {T.form.editData}
          </button>
        </Section>
        {/* Промокод — заметная плашка над суммой */}
        <PromoField order={order} onApplied={setOrder} />
        <PriceBlock order={order} />
        <p className={s.formErr} style={{ color: "var(--ink)" }}>
          {T.pay.checkWarn}
        </p>
        <div className={s.terms}>
          <label>
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => {
                haptic.select();
                setAgree(e.target.checked);
                setError(null);
              }}
              name="terms"
            />
            <span>{T.pay.termsAgree}</span>
          </label>
          <button type="button" className={s.textMore} onClick={onTerms}>
            {T.pay.termsLink}
          </button>
        </div>
        {error && (
          <p className={s.formErr} role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          className={`${s.btn} ${s.btnWide}`}
          onClick={confirm}
          disabled={busy || !agree}
          aria-busy={busy}
        >
          {busy ? <SpinnerIcon size={20} /> : null}
          {order.amount === 0 && order.price?.kind === "promotion" ? salesCopy(T.lang).freeAction : T.pay.checkYes}
        </button>
      </div>
    );
  }

  // 17.11.2026: основной способ — без чека. Сумма и номер Kaspi крупно → «✅ Тўладим» → имя, как в Kaspi
  const pt = payCopy(T.lang);
  return (
    <div className={s.screen}>
      <h1 className={s.title}>{pt.title}</h1>
      <PriceBlock order={order} />
      <div className={s.kaspiBox} data-kaspi>
        <div className={s.req}>
          <span>
            <small>{pt.kaspi}</small>
            <b className={s.kaspiPhone}>{pay.phone}</b>
            <small>{pay.name}</small>
          </span>
          <button
            type="button"
            className={`${s.btn} ${s.btnGhost} ${s.btnSmall}`}
            onClick={() => copy(pay.phone)}
            data-copy-phone
          >
            {pt.copyPhone}
          </button>
        </div>
        <div className={s.req}>
          <span>
            <small>{pt.amount}</small>
            <b>{T.price(order.amount)}</b>
          </span>
          <button
            type="button"
            className={`${s.btn} ${s.btnGhost} ${s.btnSmall}`}
            onClick={() => copy(String(order.amount))}
            data-copy-amount
          >
            {pt.copyAmount}
          </button>
        </div>
        {pay.card && (
          <div className={s.req}>
            <span>
              <small>{T.pay.card}</small>
              <b>{pay.card}</b>
            </span>
            <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSmall}`} onClick={() => copy(pay.card!)}>
              {T.pay.copy}
            </button>
          </div>
        )}
        <p className={s.help}>
          {pt.how}
          <br />
          {pt.note(order.number)}
        </p>
      </div>
      {error && (
        <p className={s.formErr} role="alert">
          {error}
        </p>
      )}
      {asking ? (
        <form
          className={s.payerForm}
          onSubmit={(e) => {
            e.preventDefault();
            sendName();
          }}
          data-payer-form
        >
          <label className={s.label} htmlFor="payer-name">
            {pt.askName}
          </label>
          <input
            id="payer-name"
            className={s.input}
            value={payer}
            onChange={(e) => {
              setPayer(e.target.value.slice(0, 40));
              setError(null);
            }}
            placeholder={pt.namePlaceholder}
            autoComplete="name"
            maxLength={40}
            name="payerName"
            autoFocus
          />
          <button
            type="submit"
            className={`${s.btn} ${s.btnWide}`}
            disabled={busy || payer.trim().length < 2}
            aria-busy={busy}
          >
            {busy ? <SpinnerIcon size={20} /> : null}
            {pt.send}
          </button>
        </form>
      ) : (
        <button
          type="button"
          className={`${s.btn} ${s.btnWide}`}
          onClick={() => {
            haptic.tap();
            setAsking(true);
          }}
          data-paid
        >
          {pt.paid}
        </button>
      )}
      {/* Чек — по желанию: прежний путь (фото/PDF) */}
      {receiptOpen ? (
        <>
          <button
            type="button"
            className={`${s.btn} ${s.btnGhost} ${s.btnWide}`}
            onClick={() => input.current?.click()}
            disabled={progress !== null}
            aria-busy={progress !== null}
          >
            {progress !== null ? (
              <>
                <SpinnerIcon size={20} />
                {`${T.pay.sending} ${Math.round(progress * 100)}%`}
              </>
            ) : (
              T.pay.upload
            )}
          </button>
          <p className={s.status}>{pt.receiptHint}</p>
        </>
      ) : (
        <button type="button" className={s.textMore} onClick={() => setReceiptOpen(true)} data-receipt-optional>
          {pt.receiptOptional}
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*,application/pdf"
        hidden
        onChange={(e) => send(e.target.files?.[0])}
      />
    </div>
  );
}

/**
 * После чека: «Тўловингиз текширилмоқда» (экран сам спрашивает статус — MiniApp),
 * подтвердили — «Таклифномангиз тайёр!» с крупной ссылкой; отказ — причина и «Чекни қайта юбориш».
 */
export function Waiting({
  order,
  night,
  onResend,
  onToast,
}: {
  order: AppOrder;
  night: boolean;
  onResend: () => void;
  onToast: (t: string) => void;
}) {
  const T = useT();
  if (order.status === "active") {
    return (
      <div className={s.done} data-state="ready">
        <div className={`${s.doneMark} ${s.doneOk}`} aria-hidden>
          <CheckIcon size={44} />
        </div>
        <h1 className={s.title}>{T.pay.readyTitle}</h1>
        <p>{T.pay.readyLead}</p>
        <a
          className={s.readyLink}
          href={order.url}
          target="_blank"
          rel="noopener"
          onClick={(e) => {
            e.preventDefault();
            openLink(order.url);
          }}
        >
          {order.url.replace(/^https?:\/\//, "")}
        </a>
        <div className={s.doneActions}>
          <button
            type="button"
            className={`${s.btn} ${s.btnWide}`}
            onClick={() => shareLink(order.url, T.orders.shareText)}
          >
            {T.pay.readyShare}
          </button>
          <button
            type="button"
            className={`${s.btn} ${s.btnGhost} ${s.btnWide}`}
            onClick={async () => {
              if (await copyText(order.url)) {
                haptic.ok();
                onToast(T.orders.copied);
              }
            }}
          >
            {T.pay.readyCopy}
          </button>
        </div>
      </div>
    );
  }
  if (order.status === "rejected") {
    return (
      <div className={s.done} data-state="rejected">
        <div className={`${s.doneMark} ${s.doneErr}`} aria-hidden>
          <CloseIcon size={40} />
        </div>
        <h1 className={s.title}>{T.pay.rejectedTitle}</h1>
        {order.rejectReason && (
          <p>
            {T.pay.rejectedReason}: <b>{order.rejectReason}</b>
          </p>
        )}
        <div className={s.doneActions}>
          <button type="button" className={`${s.btn} ${s.btnWide}`} onClick={onResend}>
            {T.pay.resend}
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className={s.done} data-state="waiting" aria-busy="true">
      <div className={s.waitRing} aria-hidden>
        <ClockIcon size={34} />
      </div>
      <h1 className={s.title}>{T.pay.waitTitle}</h1>
      <p>{night ? T.pay.waitNight : T.pay.waitDay}</p>
      <p className={s.waitNumber}>
        {T.pay.waitNumber} №{order.number} · {T.price(order.amount)}
      </p>
    </div>
  );
}
