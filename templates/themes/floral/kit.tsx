"use client";
/**
 * «Гулли рамка» — общий набор цветочных дизайнов (117–122): акварельные цветы выходят с краёв,
 * в центре светлая карточка-рамка. Без фото. Каждый дизайн задаёт свою первую композицию,
 * рамку, цвета и раскладку блоков через свой CSS-модуль (look); здесь — общая механика.
 */
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import type { InvitationData, InvitationMode } from "@/lib/types";
import { t } from "@/texts/uz-cyrl";
import type { Score } from "../../blocks/synth";
import { useInvitation, type Invitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { Countdown } from "../../blocks/Countdown";
import { MapButton } from "../../blocks/MapButton";
import type { RsvpLook } from "../../blocks/Rsvp";
import { naturalFonts } from "../natural/fonts";
import { HandCalendar, Rise, Script, tidy } from "../natural/kit";
import { initial, venues } from "../natural/common";
import { floralCredits, floralSize, floralSrc, type FloralAsset } from "./assets";
import f from "./floral.module.css";

type Look = Record<string, string>;
const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

// ── Цветок с края ──

type From = "left" | "right" | "top" | "bottom" | "tl" | "tr" | "bl" | "br";

/**
 * Три слоя: внешний — место и поворот (задаёт дизайн), средний — выплывание с края,
 * внутренний — едва заметное «дыхание». Анимируются только transform и opacity.
 */
export function Bloom({
  src,
  className,
  from = "left",
  delay = 0,
  flip = false,
  breathe = 8,
}: {
  src: FloralAsset;
  className?: string;
  from?: From;
  delay?: number;
  flip?: boolean;
  /** Период «дыхания», с (6–9) */
  breathe?: number;
}) {
  const size = floralSize(src);
  return (
    <span className={cx(f.bloom, className)} data-from={from} aria-hidden data-decor>
      <span className={f.bloomIn} style={{ "--d": `${delay}ms` } as CSSProperties}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={floralSrc(src)}
          alt=""
          width={size.width}
          height={size.height}
          decoding="async"
          className={cx(f.bloomImg, flip && f.flip)}
          style={{ "--b": `${breathe}s` } as CSSProperties}
        />
      </span>
    </span>
  );
}

// ── Рамки карточки ──

export type FrameShape = "circle" | "hexagon" | "arch" | "oval" | "peshtoq";

/** Тонкая двойная линия цветом --f-line; рисуется SVG, поэтому не «мылится» */
export function Frame({ shape, className }: { shape: FrameShape; className?: string }) {
  const common = { fill: "none", stroke: "currentColor", vectorEffect: "non-scaling-stroke" as const };
  return (
    <svg viewBox="0 0 200 200" preserveAspectRatio="none" className={cx(f.frame, className)} aria-hidden data-decor>
      {shape === "circle" && (
        <>
          <circle cx="100" cy="100" r="98" {...common} strokeWidth="1.1" />
          <circle cx="100" cy="100" r="93.5" {...common} strokeWidth="0.6" strokeDasharray="1 3" />
        </>
      )}
      {shape === "oval" && (
        <>
          <ellipse cx="100" cy="100" rx="98" ry="98" {...common} strokeWidth="1.1" />
          <ellipse cx="100" cy="100" rx="93" ry="94.5" {...common} strokeWidth="0.6" />
        </>
      )}
      {shape === "arch" && (
        <>
          <path d="M2 198V80A98 78 0 0 1 198 80v118z" {...common} strokeWidth="1.1" />
          <path d="M8 192V82A92 72 0 0 1 192 82v110z" {...common} strokeWidth="0.6" />
        </>
      )}
      {shape === "peshtoq" && (
        <>
          <path d="M2 198V84C2 50 40 24 100 2c60 22 98 48 98 82v114z" {...common} strokeWidth="1.1" />
          <path d="M8 192V86C8 55 44 31 100 10c56 21 92 45 92 76v106z" {...common} strokeWidth="0.6" />
        </>
      )}
      {shape === "hexagon" && (
        <>
          <path d="M100 1 199 50v100l-99 49L1 150V50z" {...common} strokeWidth="1.1" />
          <path d="M100 8 192 54v92l-92 46L8 146V54z" {...common} strokeWidth="0.6" />
        </>
      )}
    </svg>
  );
}

/** Узел гирих: восьмиконечная звезда из двух квадратов — над и под карточкой */
export function GirihStar({ className }: { className?: string }) {
  return (
    <svg viewBox="-12 -12 24 24" className={cx(f.star, className)} aria-hidden data-decor>
      <g fill="none" stroke="currentColor" strokeWidth="0.8">
        <rect x="-7" y="-7" width="14" height="14" />
        <rect x="-7" y="-7" width="14" height="14" transform="rotate(45)" />
        <circle r="2.2" />
      </g>
    </svg>
  );
}

/** Монограмма «Б | Д» */
export function Monogram({ a, b, className, inline = false }: { a: string; b?: string; className?: string; /** внутри кнопки — span вместо p */ inline?: boolean }) {
  const Tag = inline ? "span" : "p";
  return (
    <Tag className={cx(f.mono, className)} aria-hidden>
      <span>{a}</span>
      {b && (
        <>
          <i />
          <span>{b}</span>
        </>
      )}
    </Tag>
  );
}

// ── Первый экран: карточка ──

/** Текст карточки по очереди: монограмма → имена → тадбир → дата (шаг 170 мс) */
export function CardText({ data, inv, className, monogram = true }: { data: InvitationData; inv: Invitation; className?: string; monogram?: boolean }) {
  const w = inv.main.when;
  const date = `${String(w.day).padStart(2, "0")} · ${String(w.monthIndex + 1).padStart(2, "0")} · ${w.year}`;
  const nikoh = inv.occasion === "nikoh";
  return (
    <div className={cx(f.cardText, className)} data-card-text>
      {monogram && (
        <Monogram a={initial(nikoh ? data.groom : data.person)} b={nikoh ? initial(data.bride) : undefined} className={f.step} />
      )}
      {nikoh ? (
        <h1 className={cx(f.names, f.step)}>
          <Script text={data.groom ?? ""} className={f.nameScript} />
          <span className={f.and}>{t.natural.and}</span>
          <Script text={data.bride ?? ""} className={f.nameScript} />
        </h1>
      ) : (
        <>
          <p className={cx(f.relation, f.step)}>{t.relationWord(data.relation ?? "ogil", data.person)}</p>
          <h1 className={cx(f.names, f.step)}>
            <Script text={data.person ?? ""} className={f.nameScript} />
          </h1>
        </>
      )}
      <p className={cx(f.occasion, f.step)}>{t.occasionTitles[inv.occasion]}</p>
      <p className={cx(f.date, f.step)}>{date}</p>
    </div>
  );
}

// ── Программа на волнистой линии ──

function WavyProgram({ inv, look }: { inv: Invitation; look: Look }) {
  const list = inv.program;
  return (
    <div className={cx(f.wave, look.wave)} data-count={list.length}>
      {list.length > 1 && (
        <svg viewBox="0 0 40 400" preserveAspectRatio="none" className={f.waveLine} aria-hidden data-decor>
          <path d="M20 0C38 50 2 100 20 150s-18 100 0 150 18 70 0 100" fill="none" stroke="currentColor" vectorEffect="non-scaling-stroke" />
        </svg>
      )}
      {list.map((e, i) => (
        <Rise key={i} className={cx(f.waveItem, i % 2 ? f.waveRight : f.waveLeft)}>
          <span className={f.waveDot} aria-hidden />
          <p className={cx(f.waveTime, look.waveTime)}>{t.date.clock(e.time)}</p>
          <h3 data-event className={f.waveTitle}>{e.title}</h3>
          <p className={f.waveMeta}>{t.date.long(e.when.day, e.when.monthIndex, e.when.year)}</p>
          <p className={f.waveMeta}>{e.venueName}</p>
        </Rise>
      ))}
    </div>
  );
}

// ── Вся страница ──

export type FloralConfig = {
  melody: Score;
  /** curtain — экран-карточка с «Очинг» (Анимацияли); none — сразу страница (Оддий/Варақланадиган); custom — своё открытие */
  opening: "curtain" | "none" | "custom";
  vars: CSSProperties;
  pageColor: string;
  backdrop: string;
  music: string;
  rsvp: RsvpLook;
  assets: FloralAsset[];
  look: Look;
  heart?: boolean;
  /** Шрифт заголовков блоков вместо прописи (юбилей — прямой, читаемый) */
  titleFont?: string;
  /** Первая композиция: цветы + карточка. on — пора выплывать */
  hero: (on: boolean, inv: Invitation) => ReactNode;
  /** Цветы финала «Сизни кутамиз» */
  finale: ReactNode;
  /** Своё открытие (конверт): получает start — нажатие гостя */
  overlay?: (start: () => void, started: boolean) => ReactNode;
  /** Длительность своего открытия, мс */
  overlayMs?: number;
};

export function FloralInvitation({ data, mode, cfg }: { data: InvitationData; mode: InvitationMode; cfg: FloralConfig }) {
  const inv = useInvitation(data, mode, { melody: cfg.melody, opening: cfg.opening !== "none" });
  const reduced = useReducedMotion();
  const look = cfg.look;
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  // Нажали «очинг» — через время открытия (шторка 1,7 с, конверт overlayMs) показываем страницу
  const openMs = reduced ? 0 : cfg.opening === "custom" ? (cfg.overlayMs ?? 2000) : 1700;
  const { started, opened, finishOpening } = inv;
  useEffect(() => {
    if (!started || opened) return;
    const id = setTimeout(finishOpening, openMs);
    return () => clearTimeout(id);
    // finishOpening — новый на каждом рендере; таймер зависит только от момента нажатия
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, opened, openMs]);
  const start = () => {
    if (!inv.started) inv.start();
  };
  const titleStyle = cfg.titleFont ? { fontFamily: cfg.titleFont } : undefined;
  const on = cfg.opening === "none" ? mounted : inv.started;
  const w = inv.main.when;
  const places = venues(inv);

  return (
    <InvitationShell
      inv={inv}
      style={cfg.vars}
      fontsClassName={naturalFonts}
      pageColor={cfg.pageColor}
      backdropClassName={cfg.backdrop}
      className={cx(f.page, look.page)}
      musicVariant="soft"
      brandVariant="soft"
      musicButtonClassName={cfg.music}
      rsvpLook={cfg.rsvp}
      credits={floralCredits(cfg.assets)}
      epilogue={
        <footer className={cx(f.finale, look.finale)} data-on={on}>
          {cfg.finale}
          <Rise stagger className={f.finaleText}>
            <Script text={t.floral.wait} className={cx(f.finaleScript, look.finaleScript)} style={titleStyle} />
            <p className={f.finaleLead}>{t.hosts.respect}</p>
            {/* хозяева = одна из сторон → не повторяем фамилию дважды */}
            {!(inv.sides && [inv.sides.groom, inv.sides.bride].includes(data.hosts ?? "")) && (
              <p className={cx(f.finaleHosts, look.finaleHosts)}>{data.hosts}</p>
            )}
            {inv.sides && (
              <div className={f.sides}>
                <div>
                  <p>{t.sides.groom}</p>
                  <h3>{inv.sides.groom}</h3>
                </div>
                <span aria-hidden />
                <div>
                  <p>{t.sides.bride}</p>
                  <h3>{inv.sides.bride}</h3>
                </div>
              </div>
            )}
          </Rise>
        </footer>
      }
    >
      <div className={cx(f.heroWrap, look.heroWrap)} data-on={on}>
        {cfg.hero(on, inv)}
      </div>

      <Rise stagger className={cx(f.letter, look.letter)}>
        {inv.text.greeting && <h2>{tidy(inv.text.greeting)}</h2>}
        <p>{tidy(inv.text.body)}</p>
      </Rise>

      <section className={cx(f.section, look.dateSec)}>
        <Script text={t.natural.date} className={cx(f.title, look.title)} style={titleStyle} />
        <HandCalendar date={w} heart={cfg.heart} className={cx(f.cal, look.cal)} />
        <p className={cx(f.dateLine, look.dateLine)}>
          {t.weekdays[w.weekdayIndex]}, {t.date.clock(inv.main.time)}
        </p>
      </section>

      <section className={cx(f.section, f.count, look.count)}>
        <p className={cx(f.countLead, look.countLead)}>{t.countdown.title[inv.occasion]}</p>
        <Countdown
          startsAt={w.startsAt}
          look={{ grid: f.countGrid, box: f.countBox, number: cx(f.countNum, look.countNum), label: cx(f.countLabel, look.countLabel), today: f.countToday }}
        />
      </section>

      {inv.program.length > 1 && (
        <section className={cx(f.section, look.programSec)}>
          <Script text={t.natural.program} className={cx(f.title, look.title)} style={titleStyle} />
          <WavyProgram inv={inv} look={look} />
        </section>
      )}

      <section className={cx(f.section, look.placeSec)}>
        <Script text={t.natural.place} className={cx(f.title, look.title)} style={titleStyle} />
        {places.map((e, i) => (
          <Rise key={i} className={cx(f.venue, look.venue)}>
            <h3>{e.venueName}</h3>
            <p>{e.address}</p>
            <MapButton href={e.mapHref} className={cx(f.map, look.map)} iconClassName="text-current" />
          </Rise>
        ))}
      </section>

      {!inv.opened && cfg.opening === "curtain" && (
        // Вся шторка нажимается; для клавиатуры и чтеца — настоящая кнопка «очинг» (клик всплывает к шторке)
        <div data-open data-started={inv.started} onClick={start} className={cx(f.curtain, look.curtain)}>
          <div className={cx(f.heroWrap, look.heroWrap)} data-on={mounted} aria-hidden>
            {cfg.hero(mounted, inv)}
          </div>
          <button data-open-prompt type="button" disabled={inv.started} aria-label={t.natural.playHint} className={cx(f.tap, look.tap)}>
            {t.floral.tap}
          </button>
        </div>
      )}
      {!inv.opened && cfg.opening === "custom" && cfg.overlay?.(start, inv.started)}
    </InvitationShell>
  );
}
