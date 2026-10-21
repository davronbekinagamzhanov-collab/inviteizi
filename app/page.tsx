import Link from "next/link";
import { t } from "@/texts/uz-cyrl";
import { designs, templates } from "@/templates/registry";

/** Временная главная: список демо. Настоящий каталог будет Mini App в Telegram (Этап 2). */
export default function Home() {
  return (
    <main className="mx-auto min-h-svh max-w-[480px] px-6 py-14 text-center text-paper">
      <p className="font-serif text-4xl font-semibold">
        Invite<span className="gold-text">IZI</span>
      </p>
      <h1 className="mt-6 font-serif text-2xl">{t.site.home.heading}</h1>
      <p className="mt-3 text-sm leading-relaxed text-paper/75">{t.site.home.lead}</p>

      <h2 className="mt-12 mb-4 text-xs font-semibold tracking-[0.3em] text-gold uppercase">
        {t.site.home.demosTitle}
      </h2>
      <ul className="space-y-3">
        {designs.map((design) => {
          const variants = templates.filter((tpl) => tpl.design === design);
          return (
            <li key={design.key} className="rounded-2xl border border-gold/30 bg-white/5 p-4 text-left">
              <p className="flex items-baseline justify-between">
                <span className="font-serif text-2xl">{t.themes[design.key as keyof typeof t.themes]}</span>
                <span className="text-xs text-paper/60">
                  {t.tiers[design.tier]} {t.site.home.designNumber(design.number)}
                </span>
              </p>
              <div className="mt-3 space-y-2">
                {variants.map((tpl) => (
                  <div key={tpl.id} className="flex items-center gap-3">
                    <Link href={`/demo/${tpl.id}`} className="flex flex-1 items-center gap-3">
                      <span
                        className="h-8 w-8 shrink-0 rounded-full ring-2 ring-gold/70"
                        style={{ background: tpl.swatch }}
                      />
                      <span className="text-sm">{t.colors[tpl.color as keyof typeof t.colors]}</span>
                    </Link>
                    <Link
                      href={`/demo/${tpl.id}/namuna`}
                      className="text-xs text-gold-light/80 underline underline-offset-4"
                    >
                      {t.site.home.watermarkPreview}
                    </Link>
                  </div>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
