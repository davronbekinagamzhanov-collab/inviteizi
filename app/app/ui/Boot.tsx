"use client";
/** Первый экран, пока грузится остальное: логотип и мягкий индикатор; дольше 8 с — «Интернет секин, кутинг…» и «Қайта уриниш» */
import { useT } from "./shared";
import s from "../app.module.css";

export function Boot({ slow, onRetry }: { slow: boolean; onRetry: () => void }) {
  const T = useT();
  return (
    <div className={s.boot} data-boot aria-busy="true">
      <p className={s.bootLogo}>
        Invite<b>IZI</b>
      </p>
      <span className={s.bootBar} aria-hidden />
      <p className={s.bootText} role="status">
        {slow ? T.slow : T.loading}
      </p>
      {slow && (
        <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSmall}`} onClick={onRetry}>
          {T.retry}
        </button>
      )}
    </div>
  );
}
