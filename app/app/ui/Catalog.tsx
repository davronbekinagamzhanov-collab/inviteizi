"use client";
import Image from "next/image";
import type { Occasion } from "@/lib/types";
import { activeDesigns, PRICES, type Design } from "@/templates/registry";
import { t as inv } from "@/texts/uz-cyrl";
import { useT } from "./shared";
import { haptic } from "./telegram";
import { CancelButton } from "./Orders";
import s from "../app.module.css";

export const OCCASIONS: Occasion[] = ["nikoh", "nahorgi", "sunnat", "yubiley"];
export type Chip = Occasion | "saved";

const HEART_PATH = "M12 20.5s-7.5-4.6-9.3-9.4C1.5 7.9 3.6 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.4 0 5.5 3.4 4.3 6.6-1.8 4.8-9.3 9.4-9.3 9.4z";

/** Иконка сердца: контур — не сохранено, залита акцентным цветом — сохранено */
export function HeartIcon({ on, size = 22 }: { on: boolean; size?: number }) {
  return (
    <svg className={`${s.heartIcon} ${on ? s.heartIconOn : ""}`} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={HEART_PATH} />
    </svg>
  );
}

export function Heart({ on, onToggle, className }: { on: boolean; onToggle: () => void; className?: string }) {
  const T = useT();
  return (
    <button
      type="button"
      className={`${s.heart} ${on ? s.heartOn : ""} ${className ?? ""}`}
      aria-pressed={on}
      aria-label={on ? T.catalog.unsave : T.catalog.save}
      data-heart
      onClick={(e) => {
        e.stopPropagation();
        haptic.tap();
        onToggle();
      }}
    >
      <HeartIcon on={on} />
    </button>
  );
}

export function Catalog(props: {
  chip: Chip;
  onChip: (c: Chip) => void;
  favorites: string[];
  onFavorite: (id: string, on: boolean) => void;
  onOpen: (d: Design) => void;
  resume: { title: string; onResume: () => void; onCancel: () => Promise<boolean> } | null;
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
          <CancelButton onCancel={props.resume.onCancel} />
        </div>
      )}
      <nav className={s.chips} aria-label={T.catalog.title}>
        {OCCASIONS.map((o) => (
          <button key={o} type="button" className={s.chip} aria-pressed={props.chip === o} onClick={() => props.onChip(o)}>
            {T.occasions[o]}
          </button>
        ))}
        <button type="button" className={`${s.chip} ${s.chipIcon}`} aria-pressed={props.chip === "saved"} onClick={() => props.onChip("saved")}>
          <HeartIcon on={props.chip === "saved" || props.favorites.length > 0} size={18} />
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
