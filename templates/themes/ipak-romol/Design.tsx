"use client";

import { motion } from "motion/react";
import type { CSSProperties } from "react";
import type { Invitation } from "../../blocks/useInvitation";
import { designTexts } from "@/texts/uz-cyrl";

// свои заголовки дизайна (texts/uz-cyrl.ts → headings)
const t = designTexts("ipak-romol");
import type { TemplateProps } from "../types";
import { useInvitation } from "../../blocks/useInvitation";
import { InvitationShell } from "../../blocks/InvitationShell";
import { MapButton } from "../../blocks/MapButton";
import { Countdown } from "../../blocks/Countdown";
import { Reveal } from "../../blocks/Reveal";
import { melody } from "./melody";
import { SILK, fontClasses, vars } from "./style";
import { Words, useFitWords } from "./fit";
import { Bead, EASE, Fringe, HemBand, IslimiCartouche, SilkBackdrop, SilverGoldDefs, Sprig } from "./decor";

/** Серебристое золото для крупных цифр и «ва»: тёмные края, светлый блик в середине */
const GOLD_INK: CSSProperties = {
  backgroundImage: "linear-gradient(100deg, #6F5D41 0%, #9C8862 30%, #CDBD98 48%, #9C8862 66%, #6A583D 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

/**
 * №67 «Ипак рўмол» — никоҳ, Оддий. Страница — лавандовый шёлковый рўмол:
 * сверху печатная кайма, внизу бахрома-попук. Вокруг имён ислими
 * прорисовывается тонкой серебристо-золотой линией.
 */
export default function Design({ data, mode }: TemplateProps) {
  const inv = useInvitation(data, mode, { melody, opening: false });
  const { main, program, sides } = inv;
  const when = main.when;
  const mainDay = main.date;
  // имена: общий кегль для обоих, самое длинное слово целиком помещается в медальон
  const namesRef = useFitWords<HTMLHeadingElement>(50);

  // Мягкое появление лесенкой: всё вместе укладывается в 1,2 с
  const appear = (i: number) => ({
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay: 0.1 + i * 0.1, ease: EASE },
  });

  return (
    <InvitationShell
      inv={inv}
      style={vars}
      fontsClassName={fontClasses}
      className="text-ink"
      backdropClassName="bg-[#DCD3E7]"
      pageColor={SILK}
      // плавающая кнопка закрывала бы текст при листании: своя ▶ стоит в шапке и в конце рўмола
      musicButtonClassName="!hidden"
    >
      <SilverGoldDefs />
      <div className="relative overflow-hidden">
        <SilkBackdrop />

        <HemBand />

        <div className="relative flex flex-col items-center px-6 pt-[1.1svh] text-center">
          <motion.p {...appear(0)} className="font-body text-[17px] text-muted italic">
            {t.occasionTitles[inv.occasion]}
          </motion.p>
          <MusicToggle inv={inv} className="absolute top-[calc(1.1svh+2px)] right-3" />

          {/* Имена в ислими-медальоне */}
          <div className="-mt-1 w-[min(250px,100%,max(33svh,238px))]">
            <IslimiCartouche>
              <motion.h1
                ref={namesRef}
                className="flex w-full flex-col items-center font-display leading-[1.02] font-normal [--fit:50px] [container-type:inline-size]"
                initial={{ opacity: 0, filter: "blur(6px)", scale: 0.97 }}
                animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
                transition={{ duration: 1.1, delay: 0.25, ease: EASE }}
              >
                <span className="block text-[length:var(--fit)]">
                  <Words text={data.groom ?? ""} />
                </span>
                <span className="-my-[0.06em] block font-accent text-[clamp(26px,9cqw,34px)] leading-none" style={GOLD_INK}>
                  {t.cover.andWord}
                </span>
                <span className="block text-[length:var(--fit)]">
                  <Words text={data.bride ?? ""} />
                </span>
              </motion.h1>
            </IslimiCartouche>
          </div>

          <motion.div {...appear(2)} className="-mt-[0.6svh] max-w-[340px]">
            {inv.text.greeting && <p className="font-display text-[22px] leading-tight">{inv.text.greeting}</p>}
            <p className="mt-1 text-[16px] leading-[1.5] text-muted [text-wrap:pretty]">{inv.text.body}</p>
          </motion.div>

          {/* Тўй санаси: кун номи | сана | ой ва йил */}
          <motion.div
            {...appear(3)}
            className="mt-[1.5svh] grid w-full max-w-[330px] grid-cols-[1fr_auto_1fr] items-center gap-x-4"
            aria-label={t.date.title[inv.occasion]}
          >
            <p className="text-right text-[17px] leading-tight">{t.weekdays[when.weekdayIndex]}</p>
            <div className="flex items-center gap-4">
              <span aria-hidden className="gold-fill h-11 w-px" />
              <span className="font-display text-[50px] leading-[0.9] lining-nums" style={GOLD_INK}>
                {when.day}
              </span>
              <span aria-hidden className="gold-fill h-11 w-px" />
            </div>
            <p className="text-left text-[17px] leading-tight">
              {t.months[when.monthIndex]}
              <br />
              {when.year} {t.date.year}
            </p>
          </motion.div>

          {/* Компактный таймер: четыре колонки, подпись под числом */}
          <motion.div {...appear(4)} className="mt-[1.1svh] w-full max-w-[320px]">
            <p className="text-[16px] text-muted italic">{t.countdown.title[inv.occasion]}</p>
            <Countdown
              startsAt={when.startsAt}
              look={{
                grid: "mt-1 grid grid-cols-4",
                today: "font-display text-[26px]",
                renderUnit: (u) => (
                  <span className="flex flex-col items-center">
                    <span className="font-display text-[28px] leading-none tabular-nums lining-nums">{u.value}</span>
                    <span className="mt-0.5 text-[16px] leading-tight text-muted">{u.label}</span>
                  </span>
                ),
              }}
            />
          </motion.div>

          {/* Тўй дастури: тадбирлар на шёлковой нити */}
          <motion.section {...appear(5)} className="mt-[2svh] w-full max-w-[340px]">
            <div className="flex items-center justify-center gap-3">
              <Sprig className="w-[54px]" />
              <h2 className="font-display text-[24px] leading-none">{t.venue.programTitle}</h2>
              <Sprig className="w-[54px] -scale-x-100" />
            </div>
            <ol className="relative mt-2 text-left">
              <span aria-hidden className="absolute top-3 bottom-6 left-[74px] w-px bg-[linear-gradient(180deg,rgba(156,136,98,0),#B09C77_12%,#B09C77_88%,rgba(156,136,98,0))]" />
              {program.map((ev) => (
                <li key={`${ev.kind}-${ev.date}-${ev.time}`} className="relative pb-2.5 last:pb-0">
                <Reveal className="grid grid-cols-[60px_29px_1fr]">
                  <div className="pt-0.5 text-right">
                    <p className="font-display text-[25px] leading-none lining-nums">{t.date.clock(ev.time)}</p>
                    {ev.date !== mainDay && (
                      <p className="mt-1 text-[16px] leading-tight text-muted">
                        {ev.when.day}
                        <br />
                        {t.months[ev.when.monthIndex]}
                      </p>
                    )}
                  </div>
                  <div className="flex justify-center pt-0.5">
                    <Bead />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[17px] leading-tight font-bold">{ev.title}</p>
                    <p className="mt-0.5 text-[16px] leading-snug">
                      {ev.venueName}
                      <span className="text-muted">, {ev.address}</span>
                    </p>
                    <MapButton
                      href={ev.mapHref}
                      className="mt-1.5 rounded-full bg-[#F8F5FB]/70 px-3.5 py-1 !text-[16px] !font-normal text-ink ring-1 ring-[#B09C77]/80 !gap-1.5"
                      iconClassName="!h-4 !w-4 text-[#8C7956]"
                    />
                  </div>
                </Reveal>
                </li>
              ))}
            </ol>
          </motion.section>

          {/* Хозяева: Куёв томони / Келин томони (или одна семья). Ниже первого экрана — через Reveal */}
          <Reveal className="mt-[2.6svh] w-full max-w-[340px]">
            <p className="text-[16px] text-muted italic">{t.hosts.respectDeep}</p>
            {sides ? <Sides groom={sides.groom} bride={sides.bride} /> : <Family text={data.hosts} size={24} />}
          </Reveal>
        </div>

        {/* Ниже первого экрана: оқ фотиҳа и конец рўмола с бахромой */}
        <Reveal effect="fade" className="relative mt-[3.5svh] px-8 pb-6 text-center">
          <Sprig className="mx-auto w-[120px]" />
          <p className="mt-3 font-display text-[24px] leading-none">{t.blessing.title}</p>
          <p className="mx-auto mt-2 max-w-[310px] text-[17px] leading-[1.5] text-muted italic [text-wrap:pretty]">{inv.blessing}</p>
          <p className="mt-4 text-[16px]">{t.hosts.thanks}</p>
          <MusicToggle inv={inv} className="relative mx-auto mt-4" />
        </Reveal>

        <div className="relative">
          <HemBand />
          <div className="bg-[linear-gradient(180deg,#D8CEE4,#CDC0DC)] pb-[env(safe-area-inset-bottom)]">
            <Fringe />
          </div>
        </div>
      </div>
    </InvitationShell>
  );
}

/** Две семьи. Короткие фамилии — в две колонки, длинные — одна под другой (слова не рвутся) */
function Sides({ groom, bride }: { groom?: string; bride?: string }) {
  const longest = Math.max(...[groom, bride].flatMap((x) => (x ?? "").split(/\s+/)).map((w) => w.length));
  if (longest > 11) {
    return (
      <div className="mt-1.5 flex flex-col items-center gap-2.5">
        <SideName label={t.sides.groom} text={groom} />
        <span aria-hidden className="gold-fill h-px w-16 opacity-80" />
        <SideName label={t.sides.bride} text={bride} />
      </div>
    );
  }
  return (
    <div className="mt-1.5 grid grid-cols-[1fr_auto_1fr] items-start gap-x-3">
      <SideName label={t.sides.groom} text={groom} />
      <span aria-hidden className="gold-fill mt-1 h-12 w-px opacity-80" />
      <SideName label={t.sides.bride} text={bride} />
    </div>
  );
}

function SideName({ label, text }: { label: string; text?: string }) {
  return (
    <div className="w-full min-w-0">
      <p className="text-[16px] leading-tight text-muted">{label}</p>
      <Family text={text ?? ""} size={22} className="mt-1" />
    </div>
  );
}

/** Фамилия крупным шрифтом; кегль уменьшается, только если слово не влезает целиком */
function Family({ text, size, className = "" }: { text: string; size: number; className?: string }) {
  const ref = useFitWords<HTMLParagraphElement>(size);
  return (
    <p ref={ref} className={`font-display text-[length:var(--fit)] leading-[1.12] ${className}`} style={{ ["--fit" as string]: `${size}px` }}>
      <Words text={text} />
    </p>
  );
}

/** Своя кнопка ▶/⏸: в шапке рўмола и в его конце, не плавает поверх текста */
function MusicToggle({ inv, className = "" }: { inv: Invitation; className?: string }) {
  if (!inv.hasMusic) return null;
  return (
    <button
      type="button"
      onClick={inv.toggleMusic}
      aria-label={inv.playing ? t.music.pause : t.music.play}
      className={`z-10 flex h-11 w-11 items-center justify-center rounded-full bg-[#F6F2F9]/85 text-[#7E6B4D] shadow-[0_8px_22px_-10px_rgba(58,43,75,0.55)] ring-1 ring-[#B09C77] transition active:scale-90 ${className}`}
    >
      {inv.playing && <span className="absolute inset-0 animate-ping rounded-full ring-1 ring-[#B09C77]/60 [animation-duration:2.4s]" />}
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        {inv.playing ? <path fill="currentColor" d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /> : <path fill="currentColor" d="M8 5.5v13l11-6.5z" />}
      </svg>
    </button>
  );
}
