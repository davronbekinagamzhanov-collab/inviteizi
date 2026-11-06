"use client";
/** «Ёрдам» из шапки: коротко как заказать, «Боғланиш» (Telegram владельца) и «Шартлар» */
import { useT } from "./shared";
import { haptic, openLink } from "./telegram";
import { CloseIcon } from "./icons";
import s from "../app.module.css";

export function Help({ contact, onClose, onTerms }: { contact: string; onClose: () => void; onTerms: () => void }) {
  const T = useT();
  return (
    <div className={s.sheetBack} onClick={onClose} role="presentation">
      <div className={s.sheet} role="dialog" aria-modal="true" aria-label={T.help} onClick={(e) => e.stopPropagation()} data-help>
        <div className={s.sheetHead}>
          <h2>{T.helpTitle}</h2>
          <button type="button" className={s.backPill} onClick={onClose}>
            <CloseIcon size={18} />
            {T.catalog.close}
          </button>
        </div>
        <ol className={s.helpSteps}>
          {T.helpSteps.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ol>
        <p className={s.help}>{T.helpContactHint}</p>
        <div className={s.doneActions}>
          <button type="button" className={`${s.btn} ${s.btnWide}`} onClick={() => { haptic.tap(); openLink(contact); }}>
            {T.helpContact}
          </button>
          <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnWide}`} onClick={onTerms}>
            {T.helpTerms}
          </button>
        </div>
      </div>
    </div>
  );
}
