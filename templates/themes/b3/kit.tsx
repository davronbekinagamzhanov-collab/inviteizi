"use client";
/**
 * Батч 3 (123–138): общие блоки. Структуры (S1…S7) собирают из них свои страницы в разном порядке
 * и раскладке; цвета, мотивы и фото задаёт сам дизайн. Правило владельца: текст первого экрана
 * (имена, тадбир, дата) виден с первого кадра — анимации только украшают.
 */
import type { CSSProperties, ReactNode } from "react";
import type { InvitationData } from "@/lib/types";
import { t } from "@/texts/uz-cyrl";
import type { Invitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { Countdown } from "../../blocks/Countdown";
import { MapButton } from "../../blocks/MapButton";
import type { RsvpLook } from "../../blocks/Rsvp";
import type { PhotoCredit } from "../../blocks/Brand";
import { naturalFonts } from "../natural/fonts";
import { HandCalendar, Rise, tidy } from "../natural/kit";
import { creditsOf, shots, venues, type Shot, type Stock } from "../natural/common";
import { designVars } from "../types";
import { b3Fonts } from "./fonts";
import b from "./b3.module.css";

export const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(" ");
export type Look = Record<string, string>;

/** Общий вид дизайна: цвета (CSS-переменные), фон, музыка, RSVP */
export type Skin = {
  vars: CSSProperties;
  pageColor: string;
  backdrop: string;
  music: string;
  rsvp: RsvpLook;
};

export { Rise, tidy, venues, type Shot, type Stock };

/** Палитра дизайна → все нужные переменные (общие --c-*, блоки натурального набора --n-*) */
export function palette(p: { paper: string; ink: string; accent: string; soft: string; line: string; card: string; muted?: string }, extra: Record<string, string> = {}): CSSProperties {
  return {
    ...designVars({ primary: p.accent, primaryDark: p.ink, gold: p.accent, goldLight: p.soft, paper: p.paper, ink: p.ink, muted: p.muted ?? p.ink, accent: p.accent }),
    "--c-soft": p.soft,
    "--c-line": p.line,
    "--c-card": p.card,
    "--n-paper": p.paper,
    "--n-ink": p.ink,
    "--n-accent": p.accent,
    ...extra,
  } as CSSProperties;
}

/** Фото для мест дизайна: сначала фото клиента, потом запасные стоковые */
export function usePhotos(data: InvitationData, fallbacks: Stock[]) {
  const list = shots(data, fallbacks);
  return { list, credits: creditsOf(list) };
}

export function B3Shell({
  inv,
  skin,
  look,
  credits,
  epilogue,
  children,
}: {
  inv: Invitation;
  skin: Skin;
  look: Look;
  credits?: PhotoCredit[];
  epilogue?: ReactNode;
  children: ReactNode;
}) {
  return (
    <InvitationShell
      inv={inv}
      style={skin.vars}
      fontsClassName={`${naturalFonts} ${b3Fonts}`}
      pageColor={skin.pageColor}
      backdropClassName={skin.backdrop}
      className={cx(b.page, look.page)}
      musicVariant="soft"
      brandVariant="soft"
      musicButtonClassName={skin.music}
      rsvpLook={skin.rsvp}
      credits={credits}
      epilogue={epilogue}
    >
      {children}
    </InvitationShell>
  );
}

/** Имена: «Жених / ва / Невеста» или одно имя */
export function Names({ inv, className, andClassName, as: Tag = "h1" }: { inv: Invitation; className?: string; andClassName?: string; as?: "h1" | "h2" | "p" }) {
  const d = inv.data;
  const nikoh = inv.occasion === "nikoh" && d.groom && d.bride;
  return (
    <Tag className={cx(b.names, className)}>
      {nikoh ? (
        <>
          <span className={b.name}>{d.groom}</span>
          <span className={cx(b.and, andClassName)}>{t.natural.and}</span>
          <span className={b.name}>{d.bride}</span>
        </>
      ) : (
        <span className={b.name}>{d.person}</span>
      )}
    </Tag>
  );
}

/** «Ўғлимиз» / «Набирамиз» (не для никоҳ) */
export function Relation({ inv, className }: { inv: Invitation; className?: string }) {
  if (inv.occasion === "nikoh") return null;
  return <p className={cx(b.relation, className)}>{t.relationWord(inv.data.relation ?? "ogil", inv.data.person)}</p>;
}

export const occasionTitle = (inv: Invitation) => t.occasionTitles[inv.occasion];
export const longDate = (inv: Invitation) => {
  const w = inv.main.when;
  return t.date.long(w.day, w.monthIndex, w.year);
};

/** Возраст юбиляра: «75 ёш» */
export function Age({ inv, className }: { inv: Invitation; className?: string }) {
  if (inv.data.age == null) return null;
  return (
    <p className={cx(b.age, className)}>
      <strong>{inv.data.age}</strong> <span>{t.ageLabel}</span>
    </p>
  );
}

export function Letter({ inv, className }: { inv: Invitation; className?: string }) {
  return (
    <Rise stagger className={cx(b.letter, className)}>
      {inv.text.greeting && <h2>{tidy(inv.text.greeting)}</h2>}
      <p>{tidy(inv.text.body)}</p>
    </Rise>
  );
}

export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cx(b.title, className)}>{children}</h2>;
}

export function DateBlock({ inv, className, calClassName, heart, title = true }: { inv: Invitation; className?: string; calClassName?: string; heart?: boolean; title?: boolean }) {
  const w = inv.main.when;
  return (
    <section className={cx(b.section, className)}>
      {title && <SectionTitle>{t.natural.date}</SectionTitle>}
      <HandCalendar date={w} heart={heart} className={cx(b.cal, calClassName)} />
      <p className={b.dateLine}>
        {t.weekdays[w.weekdayIndex]}, {t.date.clock(inv.main.time)}
      </p>
    </section>
  );
}

export function Count({ inv, className, look = {} }: { inv: Invitation; className?: string; look?: Look }) {
  return (
    <section className={cx(b.section, b.count, className)}>
      <p className={cx(b.countLead, look.countLead)}>{t.countdown.title[inv.occasion]}</p>
      <Countdown
        startsAt={inv.main.when.startsAt}
        look={{ grid: cx(b.countGrid, look.countGrid), box: cx(b.countBox, look.countBox), number: cx(b.countNum, look.countNum), label: cx(b.countLabel, look.countLabel), today: b.countToday }}
      />
    </section>
  );
}

/** Программа (если тадбиров больше одного) */
export function Program({ inv, className, itemClassName, title = true }: { inv: Invitation; className?: string; itemClassName?: string; title?: boolean }) {
  if (inv.program.length < 2) return null;
  return (
    <section className={cx(b.section, className)}>
      {title && <SectionTitle>{t.natural.program}</SectionTitle>}
      <div className={b.program}>
        {inv.program.map((e, i) => (
          <Rise key={i} className={cx(b.event, itemClassName)}>
            <p className={b.eventTime}>{t.date.clock(e.time)}</p>
            <div>
              <h3 data-event>{e.title}</h3>
              <p>{t.date.long(e.when.day, e.when.monthIndex, e.when.year)}</p>
              <p>{e.venueName}</p>
            </div>
          </Rise>
        ))}
      </div>
    </section>
  );
}

/** Манзил: каждое место со своей кнопкой карты */
export function Places({ inv, className, cardClassName, title = true }: { inv: Invitation; className?: string; cardClassName?: string; title?: boolean }) {
  return (
    <section className={cx(b.section, className)}>
      {title && <SectionTitle>{t.natural.place}</SectionTitle>}
      {venues(inv).map((e, i) => (
        <Rise key={i} className={cx(b.venue, cardClassName)}>
          <h3>{e.venueName}</h3>
          <p>{e.address}</p>
          <MapButton href={e.mapHref} className={b.map} iconClassName="text-current" />
        </Rise>
      ))}
    </section>
  );
}

/** Финал: «Сизни кутамиз», подпись семьи, стороны (без повтора фамилии) */
export function Finale({ inv, className, children, wait = true }: { inv: Invitation; className?: string; children?: ReactNode; wait?: boolean }) {
  const d = inv.data;
  const dup = inv.sides && [inv.sides.groom, inv.sides.bride].includes(d.hosts ?? "");
  return (
    <footer className={cx(b.finale, className)}>
      {children}
      <Rise stagger className={b.finaleText}>
        {wait && <p className={b.finaleWait}>{t.floral.wait}</p>}
        <p className={b.finaleLead}>{t.hosts.respect}</p>
        {!dup && <p className={b.finaleHosts}>{d.hosts}</p>}
        {inv.sides && (
          <div className={b.sides}>
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
  );
}

/** Фото: клиента или запасное; object-fit cover, без «мыла» (размер под место) */
export function Pic({ shot, className, alt = "", eager }: { shot: Shot; className?: string; alt?: string; eager?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={shot.src} alt={alt} className={cx(b.pic, className)} loading={eager ? "eager" : "lazy"} decoding="async" data-client={shot.client || undefined} />
  );
}
