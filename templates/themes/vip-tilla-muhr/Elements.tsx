"use client";

import { FamilySides } from "../../blocks/FamilySides";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { t, luxuryWeddingCopy as copy } from "@/texts/uz-cyrl";
import { monthGrid } from "@/lib/wedding-date";
import type { Invitation, InvitationEventView } from "../../blocks/useInvitation";
import { useFitWords, Words } from "../../blocks/FitWords";
import { Reveal } from "../../blocks/Reveal";
import { MapButton } from "../../blocks/MapButton";
import { vipPhotos } from "./photos";
import { VipImage } from "./VipImage";
import s from "./vip.module.css";

export function Names({ inv, className = "" }: { inv: Invitation; className?: string }) {
  const ref = useFitWords<HTMLHeadingElement>(62);
  return (
    <h1 ref={ref} className={`${s.names} ${className}`}>
      <Words text={inv.data.groom ?? ""} />
      <i>{t.natural.and}</i>
      <Words text={inv.data.bride ?? ""} />
    </h1>
  );
}
export function Branch({ ornate = false }: { ornate?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={s.branch}
      viewBox="0 0 160 42"
      fill="none"
      stroke="currentColor"
      strokeWidth=".7"
    >
      <path d="M8 30Q80 6 152 30M80 19V7" />
      {[28, 48, 68, 92, 112, 132].map((x, i) => (
        <path key={x} d={`M${x} ${i < 3 ? 23 : 22}q-12-20-18-10q5 12 18 10m0 0q3-16 10-13q2 10-10 13`} />
      ))}
      {ornate && (
        <>
          <path d="M57 19Q80-13 103 19Q80 3 57 19M65 24Q80 41 95 24" />
          <circle cx="80" cy="18" r="5" />
        </>
      )}
    </svg>
  );
}
export function Greeting({ inv, id, ornate = false }: { inv: Invitation; id: string; ornate?: boolean }) {
  return (
    <section data-vip-section="greeting" className={s.greeting}>
      <VipImage photo={vipPhotos(inv.data, id)[1]} className={s.greetingPhoto} eager />
      <Reveal className={s.greetingCard}>
        <Branch ornate={ornate} />
        <h2>{inv.text.greeting}</h2>
        <p>{inv.text.body}</p>
        <p className={s.signature}>{inv.data.hosts}</p>
        <FamilySides inv={inv} />
      </Reveal>
    </section>
  );
}
export function DateSection({ inv }: { inv: Invitation }) {
  const date = inv.main.when;
  return (
    <section data-vip-section="date" className={`${s.section} ${s.dateSection}`}>
      <Reveal>
        <span className={s.eyebrow}>{copy(inv.lang).day}</span>
        <h2 className={s.script}>{t.natural.date}</h2>
        <p className={s.month}>{t.date.monthYear(date.monthIndex, date.year)}</p>
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
                  <svg viewBox="0 0 52 52" aria-hidden="true">
                    <path
                      d="M26 45C4 30 0 18 9 11c7-6 14-1 17 5 5-10 15-12 20-4 8 12-6 26-20 33Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.1"
                      pathLength="1"
                    />
                  </svg>
                )}
              </span>
            ))}
        </div>
        <p className={s.dateNote}>{t.date.long(date.day, date.monthIndex, date.year)}</p>
      </Reveal>
    </section>
  );
}
const CURVE = "M160 12 C52 80 268 160 160 225 S52 355 160 415 S268 545 160 610 S70 700 160 748";
/** Real order events only: no invented cake, ceremony or party times. Motion values avoid React renders per scroll frame. */
export function Program({ inv, ornate = false }: { inv: Invitation; ornate?: boolean }) {
  const container = useRef<HTMLDivElement>(null),
    path = useRef<SVGPathElement>(null),
    heart = useRef<HTMLSpanElement>(null);
  const metrics = useRef({ width: 320, height: 760, length: 1 });
  const x = useMotionValue(0),
    y = useMotionValue(0);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: container, offset: ["start 65%", "end 55%"] });
  function update(progress: number) {
    if (!path.current || !container.current) return;
    const point = path.current.getPointAtLength(Math.max(0, Math.min(1, progress)) * metrics.current.length);
    x.set((point.x / 320) * metrics.current.width - 9);
    y.set((point.y / 760) * metrics.current.height - 9);
    heart.current?.setAttribute("data-progress", progress.toFixed(3));
    container.current.querySelectorAll<HTMLElement>("[data-program-item]").forEach((el, i) => {
      const position = (i + 0.5) / inv.program.length;
      el.setAttribute("data-active", String(Math.abs(progress - position) < 0.22));
    });
  }
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const measure = () => {
      metrics.current = { width: el.clientWidth, height: el.clientHeight, length: path.current?.getTotalLength() ?? 1 };
      update(reduced ? 1 : scrollYProgress.get());
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
    // Current refs are measured when the theme geometry changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, inv.program.length]);
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (!reduced) update(p);
  });
  return (
    <section data-vip-section="program" className={`${s.section} ${s.program}`}>
      <Reveal>
        <Branch ornate={ornate} />
        <span className={s.eyebrow}>{copy(inv.lang).day}</span>
        <h2 className={s.script}>{t.venue.programTitle}</h2>
      </Reveal>
      <div ref={container} className={s.timeline} style={{ minHeight: Math.max(650, inv.program.length * 310) }}>
        <svg className={s.path} viewBox="0 0 320 760" preserveAspectRatio="none" aria-hidden="true">
          <path
            ref={path}
            d={CURVE}
            fill="none"
            stroke="currentColor"
            strokeWidth=".8"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <motion.span ref={heart} data-vip-heart aria-hidden="true" className={s.movingHeart} style={{ x, y }}>
          ♥
        </motion.span>
        {inv.program.map((ev, i) => (
          <article
            key={`${ev.kind}-${ev.date}-${ev.time}-${i}`}
            data-program-item
            className={s.programItem}
            style={{ top: `${((i + 0.5) / inv.program.length) * 100}%` }}
          >
            <span className={s.programNumber} aria-hidden="true">
              {String(i + 1).padStart(2, "0")}
            </span>
            <time dateTime={`${ev.date}T${ev.time}`}>{ev.time}</time>
            <h3>{ev.title}</h3>
            <p>{t.date.long(ev.when.day, ev.when.monthIndex, ev.when.year)}</p>
            <p>{ev.venueName}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
export function Venues({ inv }: { inv: Invitation }) {
  return (
    <section data-vip-section="venue" className={`${s.section} ${s.venues}`}>
      <Reveal>
        <span className={s.eyebrow}>{copy(inv.lang).arrival}</span>
        <h2 className={s.script}>{t.natural.place}</h2>
      </Reveal>
      {inv.program.map((ev, i) => (
        <Venue key={`${ev.kind}-${i}`} ev={ev} />
      ))}
    </section>
  );
}
function Venue({ ev }: { ev: InvitationEventView }) {
  return (
    <Reveal className={s.venueCard}>
      <p className={s.eyebrow}>
        {ev.title} · {ev.time}
      </p>
      <h3>{ev.venueName}</h3>
      {ev.address && <p>{ev.address}</p>}
      <MapButton href={ev.mapHref} className={s.mapButton} iconClassName="text-current" />
    </Reveal>
  );
}
export function Closing({ inv, id, ornate = false }: { inv: Invitation; id: string; ornate?: boolean }) {
  const photo = vipPhotos(inv.data, id)[2];
  return (
    <section data-vip-section="closing" className={`${s.section} ${s.closing}`}>
      <Branch ornate={ornate} />
      <p className={s.script}>{t.floral.wait}</p>
      {photo && (
        <div className={s.closingPhoto}>
          <VipImage photo={photo} />
        </div>
      )}
      <p className={s.closingNames}>
        {inv.data.groom}
        <i> {t.natural.and} </i>
        {inv.data.bride}
      </p>
      <p className={s.signature}>{inv.data.hosts}</p>
      <p className={s.blessing}>{inv.blessing}</p>
    </section>
  );
}
