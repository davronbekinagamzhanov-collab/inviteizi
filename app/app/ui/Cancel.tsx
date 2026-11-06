"use client";
import { useState } from "react";
import { useT } from "./shared";
import { haptic } from "./telegram";
import { SpinnerIcon, TrashIcon } from "./icons";
import s from "../app.module.css";

/** «Бекор қилиш»: только корзина (подпись — для экранного чтеца), подтверждение «Аниқми?» прямо в карточке */
export function CancelButton({ onCancel }: { onCancel: () => Promise<boolean> }) {
  const T = useT();
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!ask)
    return (
      <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSmall} ${s.btnQuiet} ${s.btnTrash}`} aria-label={T.orders.cancel} title={T.orders.cancel} onClick={() => { haptic.tap(); setAsk(true); }} data-cancel>
        <TrashIcon size={22} />
      </button>
    );
  return (
    <div className={s.confirm} role="alertdialog" aria-label={T.orders.cancelAsk}>
      <p>
        <b>{T.orders.cancelAsk}</b> {T.orders.cancelHint}
      </p>
      <div>
        <button type="button" className={`${s.btn} ${s.btnSmall} ${s.btnDanger}`} disabled={busy} aria-busy={busy} onClick={async () => { setBusy(true); const ok = await onCancel(); setBusy(false); if (!ok) setAsk(false); }}>
          {busy ? <SpinnerIcon size={18} /> : null}
          {T.orders.cancelYes}
        </button>
        <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSmall}`} disabled={busy} onClick={() => setAsk(false)}>
          {T.orders.cancelNo}
        </button>
      </div>
    </div>
  );
}
