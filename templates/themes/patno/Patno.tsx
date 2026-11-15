"use client";
/**
 * «Пятно» (139–141, никоҳ, Анимацияли): мягкое акварельное пятно на белой бумаге.
 * Своя структура, которой нет у остальных дизайнов:
 *  - у каждой секции своё пятно (public/art/patno/<тон>-<секция>.webp, рисует scripts/make-patno.mjs);
 *  - программа — тонкая линия с каплями; календарь — неделя строкой, день тўя в капле;
 *  - адрес — карточка с акварельным краем; финал — большое пятно с именами.
 * Открытие (fix/app-polish-2, аудит 8 000 ₸): на обложке — маленькое пятно с именами и каплей; по нажатию пятно
 * растекается на весь экран (≈2 с), бумага уходит, под ней — первая секция, где пятно продолжает «растекаться».
 * Дизайны отличаются только тоном пятен и бумаги (tuman / zumrad / upa).
 */
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import type { TemplateProps } from "../types";
import type { Score } from "../../blocks/synth";
import { useInvitation, type Invitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { MapButton } from "../../blocks/MapButton";
import { Reveal } from "../../blocks/Reveal";
import type { RsvpLook } from "../../blocks/Rsvp";
import { t } from "@/texts/uz-cyrl";
import { naturalFonts } from "../natural/fonts";
import { gentium } from "./fonts";
import s from "./patno.module.css";

export type PatnoTone = "tuman" | "zumrad" | "upa";

export type PatnoSkin = {
  tone: PatnoTone;
  /** бумага, текст, второстепенный текст, цвет пятна (капли, линии), тонкое золото */
  paper: string;
  ink: string;
  muted: string;
  wash: string;
  gold: string;
};

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");
const glue = (x: string) => x.replace(/ (ва|ва\.|&) /g, " $1 ");

/** Самое длинное слово имён → --len: длинное имя уменьшается, а не рвётся */
const nameLen = (inv: Invitation) =>
  Math.max(5, ...[inv.data.groom, inv.data.bride, inv.data.person].flatMap((n) => (n ?? "").split(/\s+/)).map((w) => w.length));

function Wash({ tone, part, className, eager }: { tone: PatnoTone; part: "hero" | "text" | "calendar" | "program" | "place" | "finale"; className?: string; eager?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/art/patno/${tone}-${part}.webp`} alt="" aria-hidden decoding="async" loading={eager ? "eager" : "lazy"} className={cx(s.wash, className)} />
  );
}

/** Капля: календарь и программа */
function Drop({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <span className={cx(s.drop, className)}>
      <svg viewBox="0 0 40 48" aria-hidden>
        <path d="M20 2C20 2 5 19.5 5 30.5a15 15 0 0 0 30 0C35 19.5 20 2 20 2Z" />
      </svg>
      {children !== undefined && <b>{children}</b>}
    </span>
  );
}

function Names({ inv, className, as: Tag = "h1" }: { inv: Invitation; className?: string; as?: "h1" | "p" }) {
  const d = inv.data;
  return (
    <Tag className={cx(s.names, className)} style={{ "--len": nameLen(inv) } as CSSProperties}>
      {d.groom && d.bride ? (
        <>
          <span>{d.groom}</span>
          <span className={s.amp}>{t.cover.and}</span>
          <span>{d.bride}</span>
        </>
      ) : (
        <span>{d.person}</span>
      )}
    </Tag>
  );
}

/** Неделя тўя строкой: Ду … Як, день тўя — в капле */
function Week({ inv }: { inv: Invitation }) {
  const w = inv.main.when;
  const start = new Date(Date.UTC(w.year, w.monthIndex, w.day - w.weekdayIndex));
  const days = Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * 86_400_000).getUTCDate());
  const label = t.date.long(w.day, w.monthIndex, w.year);
  return (
    <div className={s.week} role="img" aria-label={t.patno.weekAria(label)}>
      {days.map((day, i) => (
        <span key={i} className={cx(s.day, i === w.weekdayIndex && s.today)}>
          <small>{t.weekdaysShort[i]}</small>
          {i === w.weekdayIndex ? <Drop className={s.dayDrop}>{day}</Drop> : <b>{day}</b>}
        </span>
      ))}
    </div>
  );
}

const OPEN_MS = 2100;

export function Patno({ data, mode, melody, skin }: TemplateProps & { melody: Score; skin: PatnoSkin }) {
  const inv = useInvitation(data, mode, { melody });
  // Раскрытие пятна длится ~2 с; конец — по таймеру (и при отключённых анимациях тоже)
  const { started, opened } = inv;
  const finish = useRef(inv.finishOpening);
  useEffect(() => {
    finish.current = inv.finishOpening;
  });
  useEffect(() => {
    if (!started || opened) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const id = setTimeout(() => finish.current(), reduce ? 350 : OPEN_MS);
    return () => clearTimeout(id);
  }, [started, opened]);
  const w = inv.main.when;
  const tone = skin.tone;
  const vars = {
    "--p-paper": skin.paper,
    "--p-ink": skin.ink,
    "--p-muted": skin.muted,
    "--p-wash": skin.wash,
    "--p-gold": skin.gold,
    // плашки InviteIZI (BrandSoft) — в цветах пятна
    "--n-paper": skin.paper,
    "--n-ink": skin.ink,
    "--n-accent": skin.ink,
  } as CSSProperties;
  const rsvp: RsvpLook = { paper: "#ffffff", ink: skin.ink, line: `color-mix(in srgb, ${skin.wash} 45%, #fff)`, soft: `color-mix(in srgb, ${skin.wash} 14%, #fff)`, accent: skin.ink, font: "var(--p-text)", radius: "22px", buttonRadius: "999px" };
  const sidesOnly = inv.sides && [inv.sides.groom, inv.sides.bride].includes(data.hosts ?? "");
  const two = (n: number) => String(n).padStart(2, "0");

  return (
    <InvitationShell
      inv={inv}
      style={vars}
      fontsClassName={`${naturalFonts} ${gentium.variable}`}
      pageColor={skin.paper}
      backdropClassName={s.backdrop}
      className={s.page}
      musicVariant="soft"
      brandVariant="soft"
      musicButtonClassName={s.music}
      rsvpLook={rsvp}
    >
      {/* 0. Заставка: пятно-капля с именами; по нажатию пятно растекается на весь экран */}
      {!inv.opened && (
        <div
          className={cx(s.cover, inv.started && s.coverGo)}
          role="button"
          tabIndex={0}
          aria-label={t.opening.tapToOpen}
          onClick={inv.start}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inv.start()}
          data-cover
        >
          <Wash tone={tone} part="hero" className={s.coverWash} eager />
          <div className={s.coverInner}>
            <p className={s.kicker}>{t.opening.invitation}</p>
            <Names inv={inv} as="p" className={s.coverNames} />
            <Drop className={s.coverDrop} />
            <p data-open-prompt className={s.coverTap}>{t.opening.tapToOpen}</p>
          </div>
        </div>
      )}

      {/* 1. Обложка: имена и дата, пятно под ними растекается (после заставки) */}
      <section className={s.hero} data-tone={tone}>
        <Wash tone={tone} part="hero" className={s.heroWash} eager />
        <p className={s.kicker}>{t.opening.invitation}</p>
        <Names inv={inv} />
        <span className={s.rule} aria-hidden />
        <p className={s.big} aria-label={t.date.long(w.day, w.monthIndex, w.year)}>
          <span>{two(w.day)}</span>
          <i aria-hidden>·</i>
          <span>{two(w.monthIndex + 1)}</span>
          <i aria-hidden>·</i>
          <span>{w.year}</span>
        </p>
        <p className={s.when}>{inv.events.length > 1 ? t.weekdays[w.weekdayIndex] : `${t.weekdays[w.weekdayIndex]}, ${t.date.clock(inv.main.time)}`}</p>
      </section>

      {/* 2. Текст приглашения на своём пятне */}
      <section className={s.letter}>
        <Wash tone={tone} part="text" className={s.letterWash} />
        <Reveal>
          {inv.text.greeting && <h2 className={s.greeting}>{glue(inv.text.greeting)}</h2>}
          <p className={s.body}>{glue(inv.text.body)}</p>
        </Reveal>
      </section>

      {/* 3. Неделя строкой, день тўя в капле */}
      <section className={s.calendar}>
        <Wash tone={tone} part="calendar" className={s.calendarWash} />
        <Reveal>
          <h2 className={s.title}>{t.patno.date}</h2>
          <p className={s.month}>{t.date.long(w.day, w.monthIndex, w.year)}</p>
          <Week inv={inv} />
        </Reveal>
      </section>

      {/* 4. Программа: линия с каплями */}
      <section className={s.program}>
        <Wash tone={tone} part="program" className={s.programWash} />
        <Reveal>
          <h2 className={s.title}>{t.patno.program}</h2>
          <ol className={s.line}>
            {inv.program.map((e, i) => (
              <li key={i}>
                <Drop className={s.lineDrop} />
                <p className={s.time}>{t.date.clock(e.time)}</p>
                <p className={s.event} data-event>
                  {e.title}
                </p>
                <p className={s.eventMeta}>
                  {t.date.long(e.when.day, e.when.monthIndex, e.when.year)} · {e.venueName}
                </p>
              </li>
            ))}
          </ol>
        </Reveal>
      </section>

      {/* 5. Адрес: карточка с акварельным краем */}
      <section className={s.places}>
        <Reveal effect="spotlight">
          <h2 className={s.title}>{t.patno.place}</h2>
          {inv.events
            .filter((e, i, all) => all.findIndex((x) => x.venueName === e.venueName && x.address === e.address) === i)
            .map((e, i) => (
              <div key={i} className={s.card}>
                <Wash tone={tone} part="place" className={cx(s.cardWash, i % 2 === 1 && s.cardWashAlt)} />
                <h3>{e.venueName}</h3>
                <p>{e.address}</p>
                <MapButton href={e.mapHref} className={s.map} iconClassName="text-current" />
              </div>
            ))}
        </Reveal>
      </section>

      {/* 6. Финал: большое пятно с именами */}
      <section className={s.finale}>
        <Wash tone={tone} part="finale" className={s.finaleWash} />
        <Reveal>
          <p className={s.respect}>{t.hosts.respect}</p>
          {!sidesOnly && <p className={s.hosts}>{data.hosts}</p>}
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
          <Names inv={inv} as="p" className={s.finaleNames} />
          <p className={s.wait}>{t.patno.wait}</p>
        </Reveal>
      </section>
    </InvitationShell>
  );
}
