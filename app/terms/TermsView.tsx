import Link from "next/link";
import { env } from "@/lib/env";
import { PRICES } from "@/templates/registry";
import { termsRu, termsUz } from "@/texts/terms";

const sum = (n: number) => `${n.toLocaleString("ru-RU").replace(/\s/g, "\u00a0")}\u00a0₸`;

/** «Шартлар / Условия»: статичная страница, тот же молочный стиль, ширина телефона */
export function TermsView({ lang }: { lang: "uz" | "ru" }) {
  const T = lang === "ru" ? termsRu : termsUz;
  let contact = "@InviteIZI";
  try {
    contact = `@${env.ownerUsername()}`;
  } catch {
    /* в разработке переменной может не быть */
  }
  const p = { animated: sum(PRICES.animated), scroll: sum(PRICES.scroll), simple: sum(PRICES.simple) };
  return (
    <main lang={lang === "ru" ? "ru" : "uz-Cyrl"} className="min-h-svh bg-[#f7efe3] px-4 pt-6 pb-16 font-sans text-[#3b2a1e]">
      <div className="mx-auto max-w-[430px]">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-serif text-[30px] leading-tight font-semibold">{T.title}</h1>
          <Link href={lang === "ru" ? "/terms" : "/terms/ru"} className="rounded-full px-4 py-2 text-[15px] ring-1 ring-[#a8772a]/30">
            {T.langOther}
          </Link>
        </div>
        <p className="mt-1 text-[14px] text-[#7a6654]">{T.updated}</p>
        {T.sections(p, contact).map((sec) => (
          <section key={sec.h} className="mt-5 rounded-[18px] bg-[#fffaf2] p-4 ring-1 ring-[#a8772a]/20">
            <h2 className="text-[18px] font-bold">{sec.h}</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[16px] leading-relaxed">
              {sec.items.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
