"use client";
/** Оплата: сумма, реквизиты Kaspi с «Нусха олиш», чек — прямо здесь. Потом «Чек қабул қилинди ✅» */
import { useRef, useState } from "react";
import type { AppOrder, ReceiptResult } from "@/bot/app/service";
import { api, ApiError, MAX_FILE, shrinkImage, upload } from "./api";
import { Section, useT } from "./shared";
import { copyText, haptic } from "./telegram";
import s from "../app.module.css";

type PayInfo = { phone: string; name: string; card: string | null };

export function Pay({ order, pay, onDone, onToast }: { order: AppOrder; pay: PayInfo; onDone: (night: boolean) => void; onToast: (t: string) => void }) {
  const T = useT();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Проверка перед оплатой: реквизиты — только после «✅ Ҳаммаси тўғри, тўлаймиз»
  const [confirmed, setConfirmed] = useState(order.confirmed);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api<{ ok: true } | { error: string }>("confirmPay", { orderId: order.id });
      if ("ok" in r) {
        haptic.ok();
        setConfirmed(true);
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
          <p className={s.label}>{(order.check ?? "").split("\n").slice(1).join("\n")}</p>
          <a className={`${s.btn} ${s.btnGhost} ${s.btnSmall}`} href={order.url} target="_blank" rel="noopener">
            {T.pay.checkOpen}
          </a>
        </Section>
        <div className={s.payAmount}>
          <small>{T.pay.amount}</small>
          <b>{T.price(order.amount)}</b>
        </div>
        <p className={s.formErr} style={{ color: "var(--ink)" }}>{T.pay.checkWarn}</p>
        {error && <p className={s.formErr} role="alert">{error}</p>}
        <button type="button" className={`${s.btn} ${s.btnWide}`} onClick={confirm} disabled={busy}>
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
      <button type="button" className={`${s.btn} ${s.btnWide}`} onClick={() => input.current?.click()} disabled={progress !== null}>
        {progress !== null ? `${T.pay.sending} ${Math.round(progress * 100)}%` : T.pay.upload}
      </button>
      <p className={s.status}>{T.pay.uploadHint}</p>
      <input ref={input} type="file" accept="image/*,application/pdf" hidden onChange={(e) => send(e.target.files?.[0])} />
    </div>
  );
}

export function Done({ night }: { night: boolean }) {
  const T = useT();
  return (
    <div className={s.done}>
      <div className={s.doneMark} aria-hidden>✅</div>
      <h1 className={s.title}>{T.pay.doneTitle}</h1>
      <p>{night ? T.pay.doneNight : T.pay.doneDay}</p>
      <p style={{ color: "var(--muted)", fontSize: 16 }}>{T.pay.doneWhere}</p>
    </div>
  );
}
