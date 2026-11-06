"use client";
import { useState } from "react";
import { useT } from "./shared";
import { haptic } from "./telegram";
import { SpinnerIcon, TrashIcon } from "./icons";
import s from "../app.module.css";

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
