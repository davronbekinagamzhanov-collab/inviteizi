"use client";
/** Оплата: сумма, реквизиты Kaspi с «Нусха олиш», чек — прямо здесь. Потом «Чек қабул қилинди ✅» */
import { useRef, useState } from "react";
import type { AppOrder, ReceiptResult } from "@/bot/app/service";
import { api, ApiError, MAX_FILE, shrinkImage, upload } from "./api";
import { Section, useT } from "./shared";
import { copyText, haptic, openLink, shareLink } from "./telegram";
import { CheckIcon, ClockIcon, CloseIcon, SpinnerIcon } from "./icons";
import s from "../app.module.css";

type PayInfo = { phone: string; name: string; card: string | null };

export function Pay({ order, step, pay, onDone, onToast, onTerms, onConfirmed, onEdit, busy: editBusy }: { order: AppOrder; step: "check" | "pay"; pay: PayInfo; onDone: (night: boolean) => void; onToast: (t: string) => void; onTerms: () => void; onConfirmed: (o: AppOrder) => void; onEdit: () => void; busy?: boolean }) {
  const T = useT();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Проверка перед оплатой: реквизиты — только после «✅ Ҳаммаси тўғри, тўлаймиз» (отдельный шаг: «назад» с реквизитов → проверка)
  const confirmed = step === "pay";
  const [busy, setBusy] = useState(false);
  const [agree, setAgree] = useState(false);

  async function confirm() {
    if (busy) return;
    if (!agree) {
      haptic.error();
      return setError(T.pay.errors.terms);
    }
    setBusy(true);
    try {
      const r = await api<{ ok: true; order: AppOrder } | { error: string }>("confirmPay", { orderId: order.id, terms: true });
      if ("ok" in r) {
        haptic.ok();
        onConfirmed(r.order ?? { ...order, confirmed: true });
      } else {
        haptic.error();
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
    if (file.size > MAX_FILE) return setError(T.pay.errors.tooBig);
    setProgress(0);
    try {
      const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      const body = isPdf ? { blob: file as Blob, name: file.name || "chek.pdf" } : await shrinkImage(file);
      const r = await upload<ReceiptResult>("receipt", body.blob, body.name, { order: order.id }, setProgress);
      if ("ok" in r) {
        haptic.ok();
        onDone(r.night);
      } else {
        haptic.error();
        setError(T.pay.errors[r.error] ?? T.serverError);
      }
    } catch (e) {
      haptic.error();
      const code = e instanceof ApiError ? e.code : "server";
      setError(code === "tooBig" ? T.pay.errors.tooBig : code === "format" ? T.pay.errors.format : code === "offline" ? T.offline : T.serverError);
    } finally {
      setProgress(null);
      if (input.current) input.current.value = "";
    }
  }

  if (!confirmed) {
    return (
      <div className={s.screen}>
        <h1 className={s.title}>{T.pay.checkTitle}</h1>
        <Section title={order.title}>
          <p className={s.label}>{(order.check ?? "").split("\n").slice(1).filter((l) => !l.startsWith("💳")).join("\n")}</p>
          {order.namunaOpen !== false ? (
            <a className={`${s.btn} ${s.btnGhost} ${s.btnSmall}`} href={order.url} target="_blank" rel="noopener">
              {T.pay.checkOpen}
            </a>
          ) : (
            <p className={s.help}>{T.pay.namunaClosed}</p>
          )}
          <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnWide} ${s.btnEdit}`} onClick={onEdit} disabled={editBusy} aria-busy={editBusy} data-edit-data>
            {T.form.editData}
          </button>
        </Section>
        <div className={s.payAmount}>
          <small>{T.pay.amount}</small>
          <b>{T.price(order.amount)}</b>
        </div>
        <p className={s.formErr} style={{ color: "var(--ink)" }}>{T.pay.checkWarn}</p>
        <div className={s.terms}>
          <label>
            <input type="checkbox" checked={agree} onChange={(e) => { haptic.select(); setAgree(e.target.checked); setError(null); }} name="terms" />
            <span>{T.pay.termsAgree}</span>
          </label>
          <button type="button" className={s.textMore} onClick={onTerms}>
            {T.pay.termsLink}
          </button>
        </div>
        {error && <p className={s.formErr} role="alert">{error}</p>}
        <button type="button" className={`${s.btn} ${s.btnWide}`} onClick={confirm} disabled={busy || !agree} aria-busy={busy}>
          {busy ? <SpinnerIcon size={20} /> : null}
          {T.pay.checkYes}
        </button>
      </div>
    );
  }

  const rows: [string, string][] = [[T.pay.phone, pay.phone], ...(pay.card ? ([[T.pay.card, pay.card]] as [string, string][]) : []), [T.pay.name, pay.name]];
  return (
    <div className={s.screen}>
      <h1 className={s.title}>{T.pay.title}</h1>
      <div className={s.payAmount}>
        <small>{T.pay.amount}</small>
        <b>{T.price(order.amount)}</b>
      </div>
      <Section title={T.pay.how}>
        {rows.map(([label, value]) => (
          <div key={label} className={s.req}>
            <span>
              <small>{label}</small>
              <b>{value}</b>
            </span>
            {label !== T.pay.name && (
              <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSmall}`} onClick={() => copy(value)}>
                {T.pay.copy}
              </button>
            )}
          </div>
        ))}
        <div className={s.req}>
          <span>
            <small>{T.pay.note(order.number)}</small>
            <b>#{order.number}</b>
          </span>
          <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSmall}`} onClick={() => copy(`#${order.number}`)}>
            {T.pay.copy}
          </button>
        </div>
      </Section>
      {error && <p className={s.formErr} role="alert">{error}</p>}
      <button type="button" className={`${s.btn} ${s.btnWide}`} onClick={() => input.current?.click()} disabled={progress !== null} aria-busy={progress !== null}>
        {progress !== null ? (
          <>
            <SpinnerIcon size={20} />
            {`${T.pay.sending} ${Math.round(progress * 100)}%`}
          </>
        ) : (
          T.pay.upload
        )}
      </button>
      <p className={s.status}>{T.pay.uploadHint}</p>
      <input ref={input} type="file" accept="image/*,application/pdf" hidden onChange={(e) => send(e.target.files?.[0])} />
    </div>
  );
}

/**
 * После чека: «Тўловингиз текширилмоқда» (экран сам спрашивает статус — MiniApp),
 * подтвердили — «Таклифномангиз тайёр!» с крупной ссылкой; отказ — причина и «Чекни қайта юбориш».
 */
export function Waiting({ order, night, onResend, onToast }: { order: AppOrder; night: boolean; onResend: () => void; onToast: (t: string) => void }) {
  const T = useT();
  if (order.status === "active") {
    return (
      <div className={s.done} data-state="ready">
        <div className={`${s.doneMark} ${s.doneOk}`} aria-hidden>
          <CheckIcon size={44} />
        </div>
        <h1 className={s.title}>{T.pay.readyTitle}</h1>
        <p>{T.pay.readyLead}</p>
        <a className={s.readyLink} href={order.url} target="_blank" rel="noopener" onClick={(e) => { e.preventDefault(); openLink(order.url); }}>
          {order.url.replace(/^https?:\/\//, "")}
        </a>
        <div className={s.doneActions}>
          <button type="button" className={`${s.btn} ${s.btnWide}`} onClick={() => shareLink(order.url, T.orders.shareText)}>
            {T.pay.readyShare}
          </button>
          <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnWide}`} onClick={async () => { if (await copyText(order.url)) { haptic.ok(); onToast(T.orders.copied); } }}>
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
