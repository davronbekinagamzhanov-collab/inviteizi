"use client";
/**
 * «Таклифнома матни» в анкете: выбранный текст (2–3 строки, «Тўлиқ кўриш»), «Бошқа вариант» листает готовые
 * варианты, «Ўз матним» — свой до 600 знаков. Те же поля черновика (textId/customText), что у итога
 * «Бот танлади», НАМУНА и оплаченного приглашения — расхождений нет. Превью сверху меняется сразу.
 */
import { useMemo, useState } from "react";
import type { InvitationData } from "@/lib/types";
import { graphemes, MAX_CUSTOM_TEXT } from "@/lib/order-rules";
import { tPlain as inv } from "@/texts/uz-cyrl";
import { useT } from "./shared";
import { haptic } from "./telegram";
import { PencilIcon } from "./icons";
import s from "../app.module.css";

export function TextChoice({ data, textId, customText, onChange }: { data: InvitationData; textId?: string; customText?: string; onChange: (p: { textId?: string; customText?: string }) => void }) {
  const T = useT();
  const options = useMemo(() => inv.inviteOptions(data), [data]);
  const index = Math.max(0, options.findIndex((o) => o.id === textId));
  const chosen = options[index];
  const [own, setOwn] = useState(!!customText);
  const [full, setFull] = useState(false);
  const count = graphemes(customText ?? "");
  const next = () => {
    haptic.select();
    const o = options[(index + 1) % options.length];
    setOwn(false);
    onChange({ textId: o.id, customText: "" });
  };
  return (
    <section className={s.textBlock} aria-label={T.form.textTitle} data-text-choice>
      <h2 className={s.sectionTitle}>
        <span className={s.chipIcon}>
          <PencilIcon size={19} />
          {T.form.textTitle}
        </span>
      </h2>
      {own ? (
        <>
          <textarea className={`${s.input} ${count > MAX_CUSTOM_TEXT ? s.inputErr : ""}`} value={customText ?? ""} placeholder={T.summary.ownTextPh} onChange={(e) => onChange({ customText: e.target.value })} name="customTextForm" rows={5} />
          <span className={count > MAX_CUSTOM_TEXT ? s.err : s.help}>
            {count > MAX_CUSTOM_TEXT ? `${T.summary.ownTextCount(count, MAX_CUSTOM_TEXT)} · ${T.summary.ownTextLong(MAX_CUSTOM_TEXT)}` : T.summary.ownTextCount(count, MAX_CUSTOM_TEXT)}
          </span>
        </>
      ) : (
        <div className={s.textCard} data-text-id={chosen?.id}>
          <p className={full ? undefined : s.textClamp} key={chosen?.id}>
            {chosen?.greeting && <b>{chosen.greeting} </b>}
            {chosen?.body}
          </p>
          <button type="button" className={s.textMore} onClick={() => { haptic.tap(); setFull((f) => !f); }}>
            {full ? T.form.textShort : T.form.textFull}
          </button>
        </div>
      )}
      <div className={s.textActions}>
        {options.length > 1 && (
          <button type="button" className={`${s.btn} ${own ? s.btnGhost : ""} ${s.btnSmall}`} onClick={next}>
            {own ? T.form.textPresets : T.form.textOther(index + 1 + (own ? 0 : 0), options.length)}
          </button>
        )}
        {!own && (
          <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSmall}`} onClick={() => { haptic.select(); setOwn(true); }}>
            {T.form.textOwn}
          </button>
        )}
      </div>
      <p className={s.help}>{T.form.textHint}</p>
    </section>
  );
}
