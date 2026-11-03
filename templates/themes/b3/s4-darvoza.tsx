"use client";
/**
 * S4 «Дарвоза» (Анимацияли): резные двустворчатые ворота с ганч-гириҳом. На табличке поперёк створок —
 * имя, тадбир и сана (видны с первого кадра). По нажатию створки распахиваются внутрь двора;
 * за ними каждая часть стоит в своём арочном окне, между окнами — полоса гириҳа.
 */
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import type { TemplateProps } from "../types";
import type { Score } from "../../blocks/synth";
import { useInvitation } from "../../blocks/useInvitation";
import { OpeningCaption } from "../../blocks/OpeningCaption";
import { t } from "@/texts/uz-cyrl";
import { nameLen, Age, B3Shell, Count, DateBlock, Finale, Names, Places, Program, Relation, Rise, cx, longDate, occasionTitle, tidy, type Look, type Skin } from "./kit";
import { GanchLattice } from "./decor";
import b from "./b3.module.css";
import s from "./s4.module.css";

function Window({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Rise className={cx(s.window, className)}>
      <div className={s.windowInner}>{children}</div>
    </Rise>
  );
}

export function Darvoza({ data, mode, melody, skin, look, motif, id }: TemplateProps & { melody: Score; skin: Skin; look: Look; motif: ReactNode; id: string }) {
  const inv = useInvitation(data, mode, { melody });

  const reduced = useReducedMotion();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const open = () => {
    if (inv.started) return;
    inv.start();
    timer.current = setTimeout(inv.finishOpening, reduced ? 0 : 1900);
  };

  const band = (
    <div aria-hidden className={cx(s.band, look.band)}>
      <GanchLattice id={`${id}-band`} className={s.bandLattice} />
    </div>
  );

  return (
    <B3Shell
      inv={inv}
      skin={skin}
      look={look}
      epilogue={
        <Finale inv={inv} className={cx(s.finale, look.finale)}>
          <div className={cx(s.finMotif, look.finMotif)}>{motif}</div>
        </Finale>
      }
    >
      <div className={cx(s.root, look.root)}>
        <header className={cx(s.portal, look.portal)}>
          <div className={cx(s.portalInner, b.soft)}>
            <div className={cx(s.motif, look.motif)}>{motif}</div>
            <Relation inv={inv} className={s.relation} />
            <Names inv={inv} className={cx(s.names, look.names)} />
            <Age inv={inv} />
            <p className={cx(s.occasion, look.occasion)}>{occasionTitle(inv)}</p>
            <p className={s.date}>{longDate(inv)}</p>
          </div>
        </header>

        {band}
        <Window className={look.window}>
          {inv.text.greeting && <h2 className={s.greeting}>{tidy(inv.text.greeting)}</h2>}
          <p className={s.body}>{tidy(inv.text.body)}</p>
        </Window>
        {band}
        <Window className={look.window}>
          <DateBlock inv={inv} className={s.flat} calClassName={look.cal} />
          <Count inv={inv} className={s.flatCount} look={look} />
        </Window>
        {inv.program.length > 1 && (
          <>
            {band}
            <Window className={look.window}>
              <Program inv={inv} className={s.flat} itemClassName={look.event} />
            </Window>
          </>
        )}
        {band}
        <Places inv={inv} cardClassName={cx(s.venue, look.venue)} />
      </div>

      {!inv.opened && (
        <button type="button" data-open data-started={inv.started} onClick={open} disabled={inv.started} className={cx(s.gate, look.gate)}>
          <span className={s.court} aria-hidden />
          <span className={cx(s.leaf, s.leafL, look.leaf)}>
            <GanchLattice id={`${id}-l`} className={s.leafLattice} />
            <span className={s.knob} />
          </span>
          <span className={cx(s.leaf, s.leafR, look.leaf)}>
            <GanchLattice id={`${id}-r`} className={s.leafLattice} />
            <span className={s.knob} />
          </span>
          <span className={cx(s.plaque, b.soft, look.plaque)} style={{ "--len": nameLen(inv) } as CSSProperties}>
            <OpeningCaption inv={inv} nameClassName={s.plaqueName} metaClassName={s.plaqueMeta} />
          </span>
          <span className={cx(s.tap, look.tap)}>{t.b3.tap}</span>
        </button>
      )}
    </B3Shell>
  );
}
