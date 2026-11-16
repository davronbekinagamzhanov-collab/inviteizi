"use client";
/**
 * Цена со скидкой (17.11.2026): старая цена зачёркнута серым, новая — крупно акцентным цветом,
 * строка «Тежайсиз 4 000 ₸», подпись (акция до даты / промокод / оптовая). И «Есть промокод?» на шаге оплаты.
 */
import { useState } from "react";
import type { AppOrder } from "@/bot/app/service";
import { salesCopy, shortDate } from "@/texts/sales";
import { api, ApiError } from "./api";
import { useT } from "./shared";
import { haptic } from "./telegram";
import s from "../app.module.css";

export function PriceBlock({ order }: { order: AppOrder }) {
  const T = useT();
  const t = salesCopy(T.lang);
  const p = order.price;
  if (!p)
    return (
      <div className={s.payAmount}>
        <small>{T.pay.amount}</small>
        <b>{T.price(order.amount)}</b>
      </div>
    );
  const label =
    p.kind === "promotion"
      ? t.promotionLine(p.label, p.percent, p.endsAt ? shortDate(p.endsAt) : "")
      : p.kind === "promo"
        ? t.promoLine(p.label, p.percent)
        : t.wholesaleLine(p.percent);
  return (
    <div className={`${s.payAmount} ${s.payDeal}`} data-price-deal={p.kind}>
      <small>{T.pay.amount}</small>
      <span className={s.oldPrice}>{T.price(p.before)}</span>
      <b className={s.newPrice}>{order.amount === 0 ? t.free : T.price(order.amount)}</b>
      <span className={s.saving}>{t.saving(T.price(p.saving))}</span>
      <span className={s.dealLabel}>{label}</span>
    </div>
  );
}

export function PromoField({ order, onApplied }: { order: AppOrder; onApplied: (o: AppOrder) => void }) {
  const T = useT();
  const t = salesCopy(T.lang);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (!order.promoAllowed) return null;
  // Код уже применён: зелёная плашка «KOD: −20 %» и «✕» — убрать (цена вернётся к обычной/акционной)
  if (order.price?.kind === "promo")
    return (
      <div className={s.promoActive} data-promo-active>
        <span>🎟 {t.promoActive(order.price.label, order.price.percent)}</span>
        <button
          type="button"
          aria-label={t.promoRemove}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const r = await api<{ ok: true; order: AppOrder } | { error: string }>("promoRemove", {
                orderId: order.id,
              });
              if ("ok" in r) {
                haptic.select();
                setOpen(false);
                setMsg(null);
                onApplied(r.order);
              }
            } catch {
              haptic.error();
            } finally {
              setBusy(false);
            }
          }}
          data-promo-remove
        >
          ✕
        </button>
      </div>
    );
  async function apply() {
    if (busy || code.length < 3) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await api<{ ok: true; order: AppOrder } | { error: keyof typeof t.promoErrors | "notFound" }>("promo", {
        orderId: order.id,
        code,
      });
      if ("ok" in r) {
        haptic.ok();
        const p = r.order.price;
        setMsg({
          ok: true,
          text: t.promoApplied(code, p?.percent ?? 0, r.order.amount === 0 ? t.free : T.price(r.order.amount)),
        });
        onApplied(r.order);
      } else {
        haptic.error();
        setMsg({ ok: false, text: r.error === "notFound" ? t.promoErrors.order_locked : t.promoErrors[r.error] });
      }
    } catch (e) {
      haptic.error();
      setMsg({ ok: false, text: e instanceof ApiError && e.code === "offline" ? T.offline : T.serverError });
    } finally {
      setBusy(false);
    }
  }
  if (!open)
    return (
      <button
        type="button"
        className={s.promoBanner}
        onClick={() => {
          haptic.tap();
          setOpen(true);
        }}
        data-promo-open
      >
        {t.promoBanner}
      </button>
    );
  return (
    <div className={s.promoRow} data-promo-field>
      <input
        className={s.input}
        value={code}
        onChange={(e) =>
          setCode(
            e.target.value
              .toUpperCase()
              .replace(/[^A-Z0-9_]/g, "")
              .slice(0, 32),
          )
        }
        placeholder={t.promoPlaceholder}
        autoCapitalize="characters"
        autoComplete="off"
        aria-label={t.promoPlaceholder}
      />
      <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={apply} disabled={busy || code.length < 3}>
        {t.promoApply}
      </button>
      {msg && (
        <p className={msg.ok ? s.help : s.formErr} role={msg.ok ? "status" : "alert"} style={{ flexBasis: "100%" }}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
