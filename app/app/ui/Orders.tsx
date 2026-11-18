"use client";
/** «Менинг таклифномаларим»: статус, ссылка, QR, «Меҳмонларга юбориш»; до оплаты — ✏️ и 💳 */
import Image from "next/image";
import { useState } from "react";
import QRCode from "qrcode";
import type { AppOrder } from "@/bot/app/service";
import { getDesign, thumbOf } from "@/templates/registry";
import { fmtDate } from "./format";
import { useT } from "./shared";
import { CheckIcon, ClockIcon, CloseIcon, SpinnerIcon } from "./icons";
import { CancelButton } from "./Cancel";
import { copyText, haptic, openLink, shareLink } from "./telegram";
import { api } from "./api";
import s from "../app.module.css";

type Props = {
  orders: AppOrder[];
  onEdit: (o: AppOrder) => void;
  onPay: (o: AppOrder) => void;
  onStatus: (o: AppOrder) => void;
  onCancel: (o: AppOrder) => Promise<boolean>;
  onToast: (t: string) => void;
  /** Идёт «Ўзгартириш» / «Янги»: кнопки закрыты от двойного нажатия */
  busy?: boolean;
};

/** Статус простыми словами: Қоралама / Текширилмоқда / Тайёр / Рад этилди (+ срок истёк) */
function StatusBadge({ o }: { o: AppOrder }) {
  const T = useT();
  const kind = o.status === "active" ? "ok" : o.status === "receipt_sent" ? "wait" : o.status === "rejected" ? "err" : o.status === "archived" ? "off" : "draft";
  return (
    <span className={s.badge} data-kind={kind}>
      {kind === "ok" ? <CheckIcon size={15} /> : kind === "wait" ? <ClockIcon size={15} /> : kind === "err" ? <CloseIcon size={15} /> : null}
      {T.orders.statuses[o.status]}
    </span>
  );
}

type KeepsakeKind = "story" | "feed" | "a5" | "a6" | "video";
type KeepsakeOutcome = "sent" | "queued" | "already" | "busy" | "failed" | "unavailable" | "notActive" | "notFound";

/** «📥 Сақлаб олиш»: фото, PDF для печати, видео — файл приходит в чат с ботом */
function KeepsakePanel({ o, onToast }: { o: AppOrder; onToast: (t: string) => void }) {
  const T = useT();
  const k = T.orders.keepsake;
  const [busy, setBusy] = useState<KeepsakeKind | null>(null);
  const kinds: KeepsakeKind[] = ["story", "feed", "a5", "a6", ...(o.keepsake?.video ? (["video"] as const) : [])];
  async function get(kind: KeepsakeKind) {
    if (busy) return; // двойное нажатие
    haptic.tap();
    setBusy(kind);
    try {
      const r = await api<{ outcome?: KeepsakeOutcome }>("keepsake", { orderId: o.id, kind });
      const outcome = r.outcome ?? "failed";
      if (outcome === "sent" || outcome === "queued") haptic.ok();
      onToast(k.result[outcome]);
    } catch {
      onToast(k.result.failed);
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className={s.keepsake} data-keepsake>
      <p className={s.keepsakeHint}>{k.hint}</p>
      <div className={s.keepsakeGrid}>
        {kinds.map((kind) => (
          <button
            key={kind}
            type="button"
            className={`${s.btn} ${s.btnGhost} ${s.btnSmall}`}
            disabled={busy !== null}
            aria-busy={busy === kind}
            onClick={() => get(kind)}
          >
            {busy === kind ? <SpinnerIcon size={16} /> : null}
            {k.kinds[kind]}
          </button>
        ))}
      </div>
      <p className={s.keepsakeHint}>{k.print}</p>
    </div>
  );
}

export function Orders({ orders, onEdit, onPay, onStatus, onCancel, onToast, busy = false }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const T = useT();
  const [qr, setQr] = useState<{ id: string; src: string } | null>(null);
  const [files, setFiles] = useState<string | null>(null);

  async function showQr(o: AppOrder) {
    haptic.tap();
    if (qr?.id === o.id) return setQr(null);
    setQr({ id: o.id, src: await QRCode.toDataURL(o.url, { margin: 1, width: 440, color: { dark: "#3b2a1e", light: "#ffffff" } }) });
  }

  return (
    <div className={s.screen}>
      <h1 className={s.title}>{T.orders.title}</h1>
      {orders.length === 0 && <p className={s.empty}>{T.orders.empty}</p>}
      {orders.map((o, i) => {
        const cover = getDesign(o.templateId)?.cover;
        return (
          <article key={o.id} className={s.order} style={{ animationDelay: `${Math.min(i, 6) * 90}ms` }}>
            {cover ? <Image className={s.orderCover} src={thumbOf(cover)} alt="" width={76} height={135} /> : <span className={s.orderCover} />}
            <div style={{ minWidth: 0 }}>
              <p className={s.orderMeta}>
                {T.orders.number(o.number)} · {T.price(o.amount)}
              </p>
              <p className={s.orderTitle}>{o.title}</p>
              {o.date && <p className={s.orderMeta}>{fmtDate(o.date)}</p>}
              <StatusBadge o={o} />
            </div>
            <div className={s.orderActions}>
              {o.status !== "archived" && (
                <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSmall}`} onClick={() => openLink(o.url)}>
                  {T.orders.open}
                </button>
              )}
              {(o.status === "receipt_sent" || o.status === "rejected") && (
                <button type="button" className={`${s.btn} ${o.status === "receipt_sent" ? "" : s.btnGhost} ${s.btnSmall}`} onClick={() => onStatus(o)}>
                  {T.pay.status}
                </button>
              )}
              {o.canPay && (
                <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={() => onPay(o)}>
                  {T.orders.pay(o.amount)}
                </button>
              )}
              {o.canEdit && (
                <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSmall}`} disabled={busy} aria-busy={busy && editing === o.id} onClick={() => { setEditing(o.id); onEdit(o); }}>
                  {busy && editing === o.id ? <SpinnerIcon size={18} /> : null}
                  {T.orders.edit}
                </button>
              )}
              {o.paid && o.status === "active" && (
                <>
                  <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={() => shareLink(o.url, T.orders.shareText)}>
                    {T.orders.share}
                  </button>
                  <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSmall}`} onClick={async () => { if (await copyText(o.url)) { haptic.ok(); onToast(T.orders.copied); } }}>
                    {T.orders.copyLink}
                  </button>
                  <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSmall}`} onClick={() => showQr(o)} aria-expanded={qr?.id === o.id}>
                    {T.orders.qr}
                  </button>
                  {o.keepsake && (
                    <button
                      type="button"
                      className={`${s.btn} ${s.btnSmall}`}
                      onClick={() => {
                        haptic.tap();
                        setFiles(files === o.id ? null : o.id);
                      }}
                      aria-expanded={files === o.id}
                    >
                      {T.orders.keepsake.button}
                    </button>
                  )}
                </>
              )}
              {o.canEdit && <CancelButton onCancel={() => onCancel(o)} />}
            </div>
            {files === o.id && o.keepsake && <KeepsakePanel o={o} onToast={onToast} />}
            {qr?.id === o.id && (
              <div className={s.qr}>
                {/* eslint-disable-next-line @next/next/no-img-element -- QR из data: URL */}
                <img src={qr.src} alt={T.orders.qr} />
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
