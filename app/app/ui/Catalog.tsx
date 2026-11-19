"use client";
import Image from "next/image";
import { useState } from "react";
import type { Occasion } from "@/lib/types";
import { activeDesigns, PRICES, thumbOf, type Design } from "@/templates/registry";
import type { PromotionView } from "@/bot/pricing";
import { coversDesign, DealBadge, DealBanner, DealPrice, dealPrice, useLivePromotion } from "./Deal";
import { t as inv } from "@/texts/uz-cyrl";
import { useT } from "./shared";
import { haptic } from "./telegram";
import { CancelButton } from "./Cancel";
import { useHoldTips, type HoldProps } from "./hold";
import { CameraIcon, CloseIcon, InfoIcon } from "./icons";
import type { Format } from "@/lib/domain";
import s from "../app.module.css";

export const OCCASIONS: Occasion[] = ["nikoh", "nahorgi", "sunnat", "yubiley"];
export type Chip = Occasion | "saved";

const HEART_PATH =
  "M12 20.5s-7.5-4.6-9.3-9.4C1.5 7.9 3.6 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.4 0 5.5 3.4 4.3 6.6-1.8 4.8-9.3 9.4-9.3 9.4z";

/** Иконка сердца: контур — не сохранено, залита акцентным цветом — сохранено */
export function HeartIcon({ on, size = 22 }: { on: boolean; size?: number }) {
  return (
    <svg
      className={`${s.heartIcon} ${on ? s.heartIconOn : ""}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d={HEART_PATH} />
    </svg>
  );
}

export function Heart({
  on,
  onToggle,
  className,
  hold,
}: {
  on: boolean;
  onToggle: () => void;
  className?: string;
  hold?: HoldProps;
}) {
  const T = useT();
  return (
    <button
      {...hold}
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
  resume: { title: string; cover: string; onResume: () => void; onCancel: () => Promise<boolean> } | null;
  promotion?: PromotionView | null;
  /** «Сақлаб олиш»: фото и PDF во всех форматах, видео — в анимацияли */
  keepsake?: { files: boolean; video: boolean };
}) {
  const T = useT();
  const { promotion } = useLivePromotion(props.promotion);
  const all = activeDesigns();
  const list =
    props.chip === "saved"
      ? props.favorites.map((id) => all.find((d) => d.id === id)).filter((d): d is Design => !!d)
      : all.filter((d) => d.occasion === props.chip);
  const { bind, layer } = useHoldTips();
  const [prices, setPrices] = useState(false);
  return (
    <div className={s.screen}>
      <div className={s.titleRow}>
        <h1 className={s.title}>{T.catalog.title}</h1>
        <button
          type="button"
          className={s.infoBtn}
          aria-label={T.catalog.pricesBtn}
          onClick={() => {
            haptic.tap();
            setPrices(true);
          }}
          data-prices
        >
          <InfoIcon />
        </button>
      </div>
      <p className={s.lead}>{T.catalog.lead}</p>
      <DealBanner promotion={promotion} />
      {props.resume && (
        <section className={s.resume} aria-label={T.catalog.continueTitle} data-resume>
          <span className={s.resumeThumb}>
            <Image src={props.resume.cover} alt="" fill sizes="56px" />
          </span>
          <p>
            <small>{T.catalog.continueTitle}</small>
            <strong>{props.resume.title}</strong>
          </p>
          <div className={s.resumeActions}>
            <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={props.resume.onResume}>
              {T.catalog.continueAction}
            </button>
            <CancelButton onCancel={props.resume.onCancel} />
          </div>
        </section>
      )}
      <nav className={s.chips} aria-label={T.catalog.title}>
        {OCCASIONS.map((o) => (
          <button
            key={o}
            type="button"
            className={s.chip}
            aria-pressed={props.chip === o}
            onClick={() => props.onChip(o)}
          >
            {T.occasions[o]}
          </button>
        ))}
        <button
          type="button"
          className={`${s.chip} ${s.chipIcon}`}
          aria-pressed={props.chip === "saved"}
          onClick={() => props.onChip("saved")}
        >
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
              <button
                type="button"
                className={s.cover}
                onClick={() => props.onOpen(d)}
                aria-label={inv.designs[d.id]}
                data-design={d.id}
              >
                <Image src={thumbOf(d.cover)} alt="" fill sizes="(max-width: 480px) 50vw, 240px" priority={i < 4} />
                {coversDesign(promotion, d) && <DealBadge percent={promotion!.percent} />}
                <span className={s.pricePill} {...bind(T.catalog.tipPrice[d.format])}>
                  <DealPrice base={PRICES[d.format]} deal={dealPrice(promotion, d, PRICES[d.format])} />
                </span>
                {d.clientPhotos && (
                  <span className={s.photoBadge} aria-label={T.catalog.tipPhoto} {...bind(T.catalog.tipPhoto)}>
                    <CameraIcon size={19} />
                  </span>
                )}
              </button>
              <Heart
                on={props.favorites.includes(d.id)}
                onToggle={() => props.onFavorite(d.id, !props.favorites.includes(d.id))}
                hold={bind(T.catalog.tipSave)}
              />
              <p className={s.tileName}>{inv.designs[d.id]}</p>
              {props.chip === "saved" && <p className={s.tileSub}>{T.occasions[d.occasion]}</p>}
            </li>
          ))}
        </ul>
      )}
      {layer}
      {prices && (
        <PricesSheet
          keepsake={props.keepsake}
          onClose={() => setPrices(false)}
          onOpen={(d) => {
            setPrices(false);
            props.onOpen(d);
          }}
        />
      )}
    </div>
  );
}

const FORMATS: Format[] = ["animated", "scroll", "simple"];

/** «Нархлар фарқи»: 8 000 — очилиш анимацияси, 6 000 — варақланади, 5 000 — бир саҳифа; по примеру-демо на каждый */
function PricesSheet({
  onClose,
  onOpen,
  keepsake,
}: {
  onClose: () => void;
  onOpen: (d: Design) => void;
  keepsake?: { files: boolean; video: boolean };
}) {
  const T = useT();
  const all = activeDesigns();
  return (
    <div className={s.sheetBack} onClick={onClose} role="presentation">
      <div
        className={s.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={T.catalog.pricesTitle}
        onClick={(e) => e.stopPropagation()}
        data-prices-sheet
      >
        <div className={s.sheetHead}>
          <h2>{T.catalog.pricesTitle}</h2>
          <button type="button" className={s.backPill} onClick={onClose}>
            <CloseIcon size={18} />
            {T.catalog.close}
          </button>
        </div>
        {FORMATS.map((f) => {
          const example = all.find((d) => d.format === f && d.occasion === "nikoh") ?? all.find((d) => d.format === f);
          return (
            <div key={f} className={s.priceRow} data-format={f}>
              <b>{T.price(PRICES[f])}</b>
              <p>{T.catalog.pricesRows[f]}</p>
              {keepsake?.files && <p className={s.includes}>{T.catalog.includes(f === "animated" && keepsake.video)}</p>}
              {example && (
                <button
                  type="button"
                  className={`${s.btn} ${s.btnGhost} ${s.btnSmall}`}
                  onClick={() => {
                    haptic.tap();
                    onOpen(example);
                  }}
                >
                  {T.catalog.pricesExample}
                </button>
              )}
            </div>
          );
        })}
        <p className={s.help}>{T.catalog.pricesNote}</p>
      </div>
    </div>
  );
}
