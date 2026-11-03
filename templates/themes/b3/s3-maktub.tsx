"use client";
/**
 * S3 «Мактуб» (Оддий, без фото): одно письмо на бумаге, всё на 1–2 экранах, крупный текст
 * (основной ≥18 px) — для пожилых гостей. Без сложных анимаций: письмо мягко проявляется.
 * Дизайны отличаются бумагой, рамкой письма и мотивом (motif) в шапке и углах.
 */
import type { ReactNode } from "react";
import type { TemplateProps } from "../types";
import type { Score } from "../../blocks/synth";
import { useInvitation } from "../../blocks/useInvitation";
import { MapButton } from "../../blocks/MapButton";
import { t } from "@/texts/uz-cyrl";
import { Script } from "../natural/kit";
import { Age, B3Shell, Names, Relation, cx, weekdayTime, longDate, occasionTitle, tidy, venues, type Look, type Skin } from "./kit";
import b from "./b3.module.css";
import s from "./s3.module.css";

export function Maktub({
  data,
  mode,
  melody,
  skin,
  look,
  motif,
  corner,
}: TemplateProps & { melody: Score; skin: Skin; look: Look; motif: ReactNode; corner?: ReactNode }) {
  const inv = useInvitation(data, mode, { melody, opening: false });
  return (
    <B3Shell inv={inv} skin={skin} look={look}>
      <article className={cx(s.letter, look.letter)}>
        {corner && (
          <>
            <span className={cx(s.corner, s.tl, look.corner)} aria-hidden>{corner}</span>
            <span className={cx(s.corner, s.br, look.corner)} aria-hidden>{corner}</span>
          </>
        )}
        <header className={cx(s.head, b.soft, look.head)}>
          <div className={cx(s.motif, look.motif)}>{motif}</div>
          <Relation inv={inv} className={s.relation} />
          <Names inv={inv} className={cx(s.names, look.names)} />
          <Age inv={inv} className={s.age} />
          <p className={cx(s.occasion, look.occasion)}>{occasionTitle(inv)}</p>
          <p className={s.when}>
            <span>{longDate(inv)}</span>
            <span>{weekdayTime(inv)}</span>
          </p>
        </header>

        <div className={s.body}>
          {inv.text.greeting && <h2 className={s.greeting}>{tidy(inv.text.greeting)}</h2>}
          <p>{tidy(inv.text.body)}</p>
        </div>

        {inv.program.length > 1 && (
          <ol className={s.program}>
            {inv.program.map((e, i) => (
              <li key={i}>
                <strong>{t.date.clock(e.time)}</strong>
                <span>
                  <em data-event>{e.title}</em>
                  {t.date.long(e.when.day, e.when.monthIndex, e.when.year)} · {e.venueName}
                </span>
              </li>
            ))}
          </ol>
        )}

        <div className={s.places}>
          {venues(inv).map((e, i) => (
            <div key={i} className={cx(s.place, look.place)}>
              <h3>{e.venueName}</h3>
              <p>{e.address}</p>
              <MapButton href={e.mapHref} className={cx(b.map, s.map)} iconClassName="text-current" />
            </div>
          ))}
        </div>

        <footer className={s.sign}>
          <p className={s.respect}>{t.hosts.respect}</p>
          {!(inv.sides && [inv.sides.groom, inv.sides.bride].includes(data.hosts ?? "")) && (
            <Script text={data.hosts ?? ""} className={cx(s.hosts, look.hosts)} />
          )}
          {inv.sides && (
            <p className={s.sides}>
              <span>
                {t.sides.groom}: <b>{inv.sides.groom}</b>
              </span>
              <span>
                {t.sides.bride}: <b>{inv.sides.bride}</b>
              </span>
            </p>
          )}
          <p className={cx(s.wait, look.wait)}>{t.floral.wait}</p>
        </footer>
      </article>
    </B3Shell>
  );
}
