"use client";
/** «Менинг таклифномаларим»: статус, ссылка, QR, «Меҳмонларга юбориш»; до оплаты — ✏️ и 💳 */
import Image from "next/image";
import { useState } from "react";
import QRCode from "qrcode";
import type { AppOrder } from "@/bot/app/service";
import { getDesign, thumbOf } from "@/templates/registry";
import { fmtDate } from "./format";
import { useT } from "./shared";
import { CheckIcon, ClockIcon, CloseIcon, TrashIcon } from "./icons";
import { copyText, haptic, openLink, shareLink } from "./telegram";
import s from "../app.module.css";

type Props = {
  orders: AppOrder[];
  onEdit: (o: AppOrder) => void;
  onPay: (o: AppOrder) => void;
  onStatus: (o: AppOrder) => void;
  onCancel: (o: AppOrder) => Promise<boolean>;
  onToast: (t: string) => void;
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

/** «Бекор қилиш» с подтверждением «Аниқми?» прямо в карточке */
export function CancelButton({ onCancel }: { onCancel: () => Promise<boolean> }) {
  const T = useT();
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!ask)
    return (
      <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSmall} ${s.btnQuiet}`} onClick={() => { haptic.tap(); setAsk(true); }}>
        <TrashIcon size={18} />
        {T.orders.cancel}
      </button>
    );
  return (
    <div className={s.confirm} role="alertdialog" aria-label={T.orders.cancelAsk}>
      <p>
        <b>{T.orders.cancelAsk}</b> {T.orders.cancelHint}
      </p>
      <div>
        <button type="button" className={`${s.btn} ${s.btnSmall} ${s.btnDanger}`} disabled={busy} onClick={async () => { setBusy(true); const ok = await onCancel(); setBusy(false); if (!ok) setAsk(false); }}>
          {T.orders.cancelYes}
        </button>
        <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSmall}`} disabled={busy} onClick={() => setAsk(false)}>
          {T.orders.cancelNo}
        </button>
      </div>
    </div>
  );
}

export function Orders({ orders, onEdit, onPay, onStatus, onCancel, onToast }: Props) {
  const T = useT();
  const [qr, setQr] = useState<{ id: string; src: string } | null>(null);

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
                <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSmall}`} onClick={() => onEdit(o)}>
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
                </>
              )}
              {o.canEdit && <CancelButton onCancel={() => onCancel(o)} />}
            </div>
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
