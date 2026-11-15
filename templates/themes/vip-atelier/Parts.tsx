"use client";

import { FamilySides } from "../../blocks/FamilySides";
import type { ReactNode } from "react";
import type { InvitationData } from "@/lib/types";
import { t } from "@/texts/uz-cyrl";
import { monthGrid } from "@/lib/wedding-date";
import type { Invitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { Reveal } from "../../blocks/Reveal";
import { MapButton } from "../../blocks/MapButton";
import { useFitWords, Words } from "../../blocks/FitWords";
import { fontClasses, vipVars } from "../vip-tilla-muhr/style";
import { VipImage } from "../vip-tilla-muhr/VipImage";
import { atelier, atelierPhotos, partnerInitials, type AtelierId } from "./model";
import s from "./atelier.module.css";

export function AtelierShell({ inv, id, children }: { inv: Invitation; id: AtelierId; children: ReactNode }) {
  const p = atelier[id];
  return (
    <InvitationShell
      inv={inv}
      style={vipVars(p)}
      fontsClassName={fontClasses}
      className={`${s.page} ${s[p.kind]}`}
      backdropClassName="bg-[#e6e0d6]"
      pageColor={p.paper}
      musicVariant="soft"
      brandVariant="soft"
      rsvpLook={{
        paper: p.paper,
        ink: p.ink,
        line: p.accent,
        accent: p.accent,
        soft: p.soft,
        radius: "3px",
        buttonRadius: "2px",
      }}
      epilogue={<Closing inv={inv} />}
    >
      {children}
    </InvitationShell>
  );
}

export function Monogram({ data }: { data: Pick<InvitationData, "groom" | "bride"> }) {
  const [first, second] = partnerInitials(data);
  return (
    <span data-latin-monogram className={s.monogram} aria-label={`${first} ${second}`}>
      <span>{first}</span>
      <span>{second}</span>
    </span>
  );
}
export function Ornament() {
  return (
    <svg
      aria-hidden="true"
      className={s.ornament}
      viewBox="0 0 150 36"
      fill="none"
      stroke="currentColor"
      strokeWidth=".7"
    >
      <path d="M5 18h43m54 0h43M49 18q16-19 26 0q10-19 26 0q-16 19-26 0q-10 19-26 0Z" />
      <path d="M75 5v26M64 18h22" />
      <circle cx="75" cy="18" r="5" />
    </svg>
  );
}

export function Title({ inv }: { inv: Invitation }) {
  const ref = useFitWords<HTMLHeadingElement>(inv.occasion === "nikoh" ? 48 : 45);
  return (
    <h1 ref={ref} className={s.names}>
      {inv.occasion === "nikoh" ? (
        <>
          <Words text={inv.data.groom ?? ""} />
          <i>{t.natural.and}</i>
          <Words text={inv.data.bride ?? ""} />
        </>
      ) : (
        <Words text={inv.data.person ?? ""} />
      )}
    </h1>
  );
}
export function Photo({
  inv,
  id,
  slot,
  className = "",
  eager = false,
}: {
  inv: Invitation;
  id: AtelierId;
  slot: 1 | 2 | 3;
  className?: string;
  eager?: boolean;
}) {
  const photo = atelierPhotos(inv.data, id)[slot - 1];
  return photo ? (
    <div className={`${s.photo} ${className}`}>
      <VipImage photo={photo} eager={eager} />
    </div>
  ) : null;
}
export function DateLine({ inv }: { inv: Invitation }) {
  return <p className={s.dateLine}>{t.date.long(inv.main.when.day, inv.main.when.monthIndex, inv.main.when.year)}</p>;
}
export function ScrollNote() {
  return (
    <span className={s.scrollNote}>
      {t.b3.swipeDown}
      <span>↓</span>
    </span>
  );
}

export function Letter({ inv, children }: { inv: Invitation; children?: ReactNode }) {
  return (
    <section data-vip-section="greeting" className={s.letter}>
      <Reveal effect="fade">
        <span className={s.eyebrow}>{t.vip.withLove}</span>
        <h2>{inv.text.greeting}</h2>
        <p className={s.body}>{inv.text.body}</p>
        <p className={s.signature}>{inv.data.hosts}</p>
        <FamilySides inv={inv} />
        <Ornament />
      </Reveal>
      {children}
    </section>
  );
}
export function Calendar({ inv }: { inv: Invitation }) {
  const date = inv.main.when;
  return (
    <section data-vip-section="date" className={s.dateSection}>
      <Reveal effect="fade">
        <span className={s.eyebrow}>{t.date.title[inv.occasion]}</span>
        <div className={s.dateNumber}>
          <span>{String(date.day).padStart(2, "0")}</span>
          <div>
            {t.date.monthYear(date.monthIndex, date.year)}
            <small>
              {t.date.time} {inv.main.time}
            </small>
          </div>
        </div>
        <div
          className={s.calendar}
          aria-label={t.natural.calendarAria(t.date.long(date.day, date.monthIndex, date.year))}
        >
          {t.weekdaysShort.map((d) => (
            <span className={s.weekday} key={d}>
              {d}
            </span>
          ))}
          {monthGrid(date.year, date.monthIndex)
            .flat()
            .map((d, i) => (
              <span key={i} className={s.day} aria-current={d === date.day ? "date" : undefined}>
                {d}
                {d === date.day && (
                  <svg viewBox="0 0 44 44" aria-hidden="true">
                    <circle cx="22" cy="22" r="20" pathLength="1" />
                  </svg>
                )}
              </span>
            ))}
        </div>
      </Reveal>
    </section>
  );
}
export function Program({ inv }: { inv: Invitation }) {
  return (
    <section data-vip-section="program" className={s.program}>
      <Reveal>
        <span className={s.eyebrow}>{t.vip.ourDay}</span>
        <h2>{inv.occasion === "nikoh" ? t.venue.programTitle : t.occasionTitles[inv.occasion]}</h2>
      </Reveal>
      <ol>
        {inv.program.map((ev, i) => (
          <li key={`${ev.kind}-${ev.date}-${i}`}>
            <Reveal delay={i * 0.1}>
              <span className={s.eventNumber}>{String(i + 1).padStart(2, "0")}</span>
              <div className={s.eventInfo}>
                <time dateTime={`${ev.date}T${ev.time}`}>{ev.time}</time>
                <h3>{ev.title}</h3>
                <p>{t.date.long(ev.when.day, ev.when.monthIndex, ev.when.year)}</p>
                <p>{ev.venueName}</p>
              </div>
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  );
}
export function Venues({ inv }: { inv: Invitation }) {
  return (
    <section data-vip-section="venue" className={s.venues}>
      <Reveal>
        <span className={s.eyebrow}>{t.vip.together}</span>
        <h2>{t.natural.place}</h2>
      </Reveal>
      {inv.program.map((ev, i) => (
        <Reveal key={`${ev.kind}-${ev.date}-${i}`} className={s.venue}>
          <span className={s.venueIndex}>{String(i + 1).padStart(2, "0")}</span>
          <span className={s.eyebrow}>
            {ev.title} · {ev.time}
          </span>
          <h3>{ev.venueName}</h3>
          <p>{ev.address}</p>
          <MapButton href={ev.mapHref} className={s.mapButton} iconClassName="text-current" />
        </Reveal>
      ))}
    </section>
  );
}
export function Blessing({ inv }: { inv: Invitation }) {
  return (
    <section data-vip-section="blessing" className={s.blessing}>
      <Reveal effect="fade">
        <Ornament />
        <span className={s.eyebrow}>{t.blessing.title}</span>
        <p>{inv.blessing}</p>
      </Reveal>
    </section>
  );
}
function Closing({ inv }: { inv: Invitation }) {
  return (
    <section data-vip-section="closing" data-atelier-closing className={s.closing}>
      <Reveal effect="fade">
        {inv.occasion === "nikoh" ? <Monogram data={inv.data} /> : <Ornament />}
        <h2>{t.hosts.waiting}</h2>
        <p>{inv.data.hosts}</p>
        <DateLine inv={inv} />
      </Reveal>
    </section>
  );
}
