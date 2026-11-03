"use client";
/**
 * S5 «Альбом»: страница семейного альбома. Наверху — имена, тадбир и сана (видны с первого кадра),
 * под ними — главное фото-полароид с лентой, подпись от руки. Дальше — текст, ещё два полароида
 * (в «Варақланадиган» — лента фото, листается вбок), сана в «уголках альбома», программа, манзил.
 * Фото — клиента; если нет, запасные стоковые (дизайн красив и без фото клиента).
 */
import type { ReactNode } from "react";
import type { TemplateProps } from "../types";
import type { Score } from "../../blocks/synth";
import { useInvitation, type Invitation } from "../../blocks/useInvitation";
import { t } from "@/texts/uz-cyrl";
import { Age, B3Shell, Count, DateBlock, Finale, Names, Pic, Places, Program, Relation, Rise, cx, longDate, occasionTitle, tidy, usePhotos, type Look, type Shot, type Skin, type Stock } from "./kit";
import b from "./b3.module.css";
import s from "./s5.module.css";

const shortDate = (inv: Invitation) => {
  const w = inv.main.when;
  return `${String(w.day).padStart(2, "0")}.${String(w.monthIndex + 1).padStart(2, "0")}.${w.year}`;
};

function Polaroid({ shot, caption, className, tilt, eager }: { shot: Shot; caption: string; className?: string; tilt: number; eager?: boolean }) {
  return (
    <figure className={cx(s.polaroid, className)} style={{ rotate: `${tilt}deg` }}>
      <span aria-hidden className={s.tape} />
      <div className={s.frame}>
        <Pic shot={shot} eager={eager} />
      </div>
      {caption && <figcaption className={s.caption}>{caption}</figcaption>}
    </figure>
  );
}

export function Albom({
  data,
  mode,
  melody,
  skin,
  look,
  motif,
  photos: stock,
  strip,
}: TemplateProps & { melody: Score; skin: Skin; look: Look; motif: ReactNode; photos: Stock[]; strip?: boolean }) {
  const inv = useInvitation(data, mode, { melody, opening: false });
  const photos = usePhotos(data, stock);
  const [hero, ...rest] = photos.list;
  const captions = [occasionTitle(inv), t.b3.album];

  return (
    <B3Shell
      inv={inv}
      skin={skin}
      look={look}
      credits={photos.credits}
      epilogue={
        <Finale inv={inv} className={cx(s.finale, look.finale)}>
          <div className={cx(s.finMotif, look.finMotif)}>{motif}</div>
        </Finale>
      }
    >
      <div className={cx(s.root, look.root)}>
        <header className={cx(s.head, b.soft, look.head)}>
          <Relation inv={inv} className={s.relation} />
          <Names inv={inv} className={cx(s.names, look.names)} />
          <Age inv={inv} />
          <p className={cx(s.occasion, look.occasion)}>{occasionTitle(inv)}</p>
          <p className={cx(s.date, look.date)}>{longDate(inv)}</p>
        </header>

        {strip ? (
          <section className={cx(s.stripWrap, look.stripWrap)}>
            <div className={s.strip} data-hscroll>
              {photos.list.map((p, i) => (
                <Polaroid key={i} shot={p} caption={[shortDate(inv), ...captions][i] ?? ""} tilt={i % 2 ? 2 : -1.5} eager={i === 0} className={s.stripItem} />
              ))}
            </div>
            <p className={s.stripHint}>
              {t.b3.swipeSide}
              <span aria-hidden className={s.sideArrow} />
            </p>
          </section>
        ) : (
          hero && <Polaroid shot={hero} caption={shortDate(inv)} tilt={-2.5} eager className={cx(s.hero, look.hero)} />
        )}

        <Rise className={cx(s.text, look.text)}>
          <div className={cx(s.textMotif, look.textMotif)}>{motif}</div>
          {inv.text.greeting && <h2>{tidy(inv.text.greeting)}</h2>}
          <p>{tidy(inv.text.body)}</p>
        </Rise>

        {!strip && rest.length > 0 && (
          <Rise className={cx(s.pair, look.pair)}>
            {rest.slice(0, 2).map((p, i) => (
              <Polaroid key={i} shot={p} caption={captions[i]} tilt={i ? 3 : -3} className={s.small} />
            ))}
          </Rise>
        )}

        <div className={cx(s.corners, look.corners)}>
          <span aria-hidden className={s.corner} />
          <span aria-hidden className={s.corner} />
          <span aria-hidden className={s.corner} />
          <span aria-hidden className={s.corner} />
          <DateBlock inv={inv} className={s.flat} calClassName={look.cal} />
          <Count inv={inv} className={s.flat} look={look} />
        </div>

        {inv.program.length > 1 && <Program inv={inv} itemClassName={look.event} />}
        <Places inv={inv} cardClassName={look.venue} />
      </div>
    </B3Shell>
  );
}
