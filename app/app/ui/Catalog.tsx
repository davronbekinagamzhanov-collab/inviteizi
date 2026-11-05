"use client";
import Image from "next/image";
import type { Occasion } from "@/lib/types";
import { activeDesigns, PRICES, type Design } from "@/templates/registry";
import { t as inv } from "@/texts/uz-cyrl";
import { useT } from "./shared";
import { haptic } from "./telegram";
import s from "../app.module.css";

export const OCCASIONS: Occasion[] = ["nikoh", "nahorgi", "sunnat", "yubiley"];
export type Chip = Occasion | "saved";

export function Heart({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  const T = useT();
  return (
    <button
      type="button"
      className={`${s.heart} ${on ? s.heartOn : ""}`}
      aria-pressed={on}
      aria-label={on ? T.catalog.unsave : T.catalog.save}
      onClick={(e) => {
        e.stopPropagation();
        haptic.tap();
        onToggle();
      }}
    >
      {on ? "❤️" : "🤍"}
    </button>
  );
}

export function Catalog(props: {
  chip: Chip;
  onChip: (c: Chip) => void;
  favorites: string[];
  onFavorite: (id: string, on: boolean) => void;
  onOpen: (d: Design) => void;
  resume: { title: string; onResume: () => void } | null;
}) {
  const T = useT();
  const all = activeDesigns();
  const list = props.chip === "saved" ? props.favorites.map((id) => all.find((d) => d.id === id)).filter((d): d is Design => !!d) : all.filter((d) => d.occasion === props.chip);
  return (
    <div className={s.screen}>
      <h1 className={s.title}>{T.catalog.title}</h1>
      <p className={s.lead}>{T.catalog.lead}</p>
      {props.resume && (
        <div className={s.resume}>
          <p>
            <small>{T.catalog.continueTitle}</small>
            <strong>{props.resume.title}</strong>
          </p>
          <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={props.resume.onResume}>
            {T.catalog.continueAction}
          </button>
        </div>
      )}
      <nav className={s.chips} aria-label={T.catalog.title}>
        {OCCASIONS.map((o) => (
          <button key={o} type="button" className={s.chip} aria-pressed={props.chip === o} onClick={() => props.onChip(o)}>
            {T.occasions[o]}
          </button>
        ))}
        <button type="button" className={s.chip} aria-pressed={props.chip === "saved"} onClick={() => props.onChip("saved")}>
          {T.savedChip}
          {props.favorites.length ? ` ${props.favorites.length}` : ""}
        </button>
      </nav>
      {list.length === 0 ? (
        <p className={s.empty}>{T.catalog.emptySaved}</p>
      ) : (
        <ul className={s.grid} style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {list.map((d, i) => (
            <li key={d.id} className={s.tile} style={{ animationDelay: `${Math.min(i, 8) * 90}ms` }}>
              <button type="button" className={s.cover} onClick={() => props.onOpen(d)} aria-label={inv.designs[d.id]} data-design={d.id}>
                <Image src={d.cover} alt="" fill sizes="(max-width: 480px) 50vw, 240px" priority={i < 4} />
                <span className={s.pricePill}>{T.price(PRICES[d.format])}</span>
                {d.clientPhotos && (
                  <span className={s.photoBadge} title={T.catalog.photo}>
                    📷
                  </span>
                )}
              </button>
              <Heart on={props.favorites.includes(d.id)} onToggle={() => props.onFavorite(d.id, !props.favorites.includes(d.id))} />
              <p className={s.tileName}>{inv.designs[d.id]}</p>
              {props.chip === "saved" && <p className={s.tileSub}>{T.occasions[d.occasion]}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
