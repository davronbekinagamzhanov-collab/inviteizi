"use client";
/**
 * Панель менеджера (ru) и партнёра (uz/ru/kk): только чтение, тот же вид, что /app/owner.
 * Роль решает сервер по initData (action rolePanel); владельцу, клиентам и чужим — «нет доступа».
 */
import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import type { ManagerPanel, PartnerPanel, RolePeriod } from "@/bot/app/roles-panel";
import type { Lang } from "@/lib/domain";
import { appUz } from "@/texts/app-uz";
import { appRu } from "@/texts/app-ru";
import { appKk } from "@/texts/app-kk";
import { api, ApiError } from "../ui/api";
import { copyText, haptic, setupTelegram, shareLink, tg } from "../ui/telegram";
import s from "../owner/owner.module.css";

type Phase = "boot" | "denied" | "error" | "ready";
const money = (n: number) => `${n.toLocaleString("ru-RU").replace(/ /g, " ")} ₸`;
const day = (iso: string) => {
  const d = new Date(+new Date(iso) + 5 * 3_600_000).toISOString();
  return `${d.slice(8, 10)}.${d.slice(5, 7)}`;
};
const rateText = (rate: number, pct: number | null) => (pct != null ? `${pct}%` : money(rate));
const MANAGER_PERIODS: Record<RolePeriod, string> = { w: "Неделя", m: "Месяц", a: "Всё время" };
const PARTNER_STATUS: Record<string, string> = { pending: "ждёт ✅ владельца", active: "работает", rejected: "отклонён" };

export default function PanelApp({ fontClass }: { fontClass: string }) {
  const [phase, setPhase] = useState<Phase>("boot");
  const [period, setPeriod] = useState<RolePeriod>("m");
  const [data, setData] = useState<ManagerPanel | PartnerPanel | null>(null);
  const [lang, setLang] = useState<Lang>("uz");
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async (p: RolePeriod) => {
    setLoading(true);
    try {
      setData(await api<ManagerPanel | PartnerPanel>("rolePanel", { period: p }));
      setPhase("ready");
    } catch (e) {
      setPhase(e instanceof ApiError && (e.code === "forbidden" || e.code === "auth") ? "denied" : "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      for (let i = 0; i < 100 && !tg(); i++) await new Promise((r) => setTimeout(r, 100));
      if (!alive) return;
      setupTelegram();
      const code = tg()?.initDataUnsafe?.user?.language_code ?? "";
      setLang(code.startsWith("ru") ? "ru" : code.startsWith("kk") ? "kk" : "uz");
      if (!tg()?.initData) return setPhase("denied");
      try {
        const sess = await api<{ lang: Lang }>("session");
        if (alive) setLang(sess.lang);
      } catch {
        /* язык Telegram — тоже годится */
      }
      await load("m");
    })();
    return () => {
      alive = false;
    };
  }, [load]);

  const flash = (t: string) => {
    setNote(t);
    setTimeout(() => setNote(null), 2400);
  };
  function pick(p: RolePeriod) {
    if (p === period) return;
    haptic.select();
    setPeriod(p);
    load(p);
  }

  const T = (lang === "ru" || data?.role === "manager" ? appRu : lang === "kk" ? appKk : appUz).partnerPanel;
  if (phase !== "ready" || !data) {
    return (
      <div className={`${s.root} ${fontClass}`}>
        <p className={s.center} data-phase={phase}>{phase === "boot" ? T.loading : phase === "denied" ? T.denied : T.error}</p>
      </div>
    );
  }
  const periods = data.role === "manager" ? MANAGER_PERIODS : T.periods;
  return (
    <div className={`${s.root} ${fontClass}`} lang={data.role === "manager" ? "ru" : lang === "ru" ? "ru" : lang === "kk" ? "kk" : "uz-Cyrl"} aria-busy={loading} data-role={data.role}>
      <header className={s.top}>
        <div className={s.periods} role="tablist" aria-label="Period">
          {(Object.keys(periods) as RolePeriod[]).map((p) => (
            <button key={p} type="button" role="tab" aria-selected={period === p} onClick={() => pick(p)}>
              {periods[p]}
            </button>
          ))}
        </div>
      </header>
      <main className={s.wrap} style={{ opacity: loading ? 0.55 : 1 }}>
        {data.role === "manager" ? <Manager d={data} /> : <Partner d={data} T={T} onNote={flash} />}
      </main>
      {note && (
        <div className={s.toast} role="status">
          {note}
        </div>
      )}
    </div>
  );
}

function Manager({ d }: { d: ManagerPanel }) {
  const [tab, setTab] = useState<"pay" | "partners" | "sleep">("pay");
  const sleeping = d.partners.filter((p) => p.sleeping);
  const list = tab === "sleep" ? sleeping : d.partners;
  const left = Math.max(0, d.earn.goal - d.earn.orders);
  return (
    <>
      <p className={s.label}>Моя сеть · {d.label}</p>
      <section className={s.cards} aria-label="Итоги">
        <div className={`${s.card} ${s.cardWide}`} data-card="paid">
          <small>Оплаты сети</small>
          <strong>{money(d.cards.revenue)}</strong>
          <span>{d.cards.paid} оплат</span>
        </div>
        <div className={`${s.card} ${s.cardWide}`} data-card="earn">
          <small>Мой заработок за месяц</small>
          <strong>{money(d.earn.amount)}</strong>
          <span>{left ? `${d.earn.orders} из ${d.earn.goal} — ещё ${left} до бонуса ${money(d.earn.bonus)}` : `Цель ${d.earn.goal} выполнена · бонус ${money(d.earn.bonus)}`}</span>
        </div>
        <div className={s.card} data-card="partners">
          <small>Партнёры</small>
          <strong>{d.cards.partners}</strong>
        </div>
        <div className={s.card} data-card="sleeping">
          <small>Спящие (14 дн.)</small>
          <strong>{d.cards.sleeping}</strong>
        </div>
      </section>
      <p className={s.hint}>
        {money(d.earn.perOrder)} за каждую оплату сети · {d.earn.goal}+ оплат в месяц — бонус {money(d.earn.bonus)}
      </p>
      <nav className={s.tabs} role="tablist" aria-label="Разделы">
        {[["pay", "Оплаты"], ["partners", "Партнёры"], ["sleep", `Спящие${sleeping.length ? ` ${sleeping.length}` : ""}`]].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => { haptic.select(); setTab(id as typeof tab); }}>
            {label}
          </button>
        ))}
      </nav>
      {tab === "pay" ? (
        d.payments.length === 0 ? (
          <p className={s.empty}>За этот период оплат нет</p>
        ) : (
          <ul className={s.list}>
            {d.payments.map((p) => (
              <li key={p.number} className={s.row} data-payment={p.number}>
                <div className={s.rowHead}>
                  <b>№{p.number}</b>
                  <span className={s.amount}>{money(p.amount)}</span>
                </div>
                <p className={s.rowSub}>
                  {day(p.paidAt)} · клиент {p.initial}.{p.partner ? ` · ${p.partner}` : " · заказ для клиента"}
                </p>
              </li>
            ))}
          </ul>
        )
      ) : list.length === 0 ? (
        <p className={s.empty}>{tab === "sleep" ? "Спящих партнёров нет" : "Партнёров пока нет"}</p>
      ) : (
        <ul className={s.list}>
          {list.map((p) => (
            <li key={p.id} className={s.row} data-partner={p.id}>
              <div className={s.rowHead}>
                <b>{p.name}</b>
                <span className={s.amount}>{rateText(p.rate, p.ratePercent)}</span>
              </div>
              <p className={s.rowSub}>
                Сканы {p.scanned} · оплаты {p.paid} · к выплате {money(p.due)}
              </p>
              <div className={s.rowFoot}>
                <span className={`${s.badge} ${p.status === "active" && !p.sleeping ? s.badgeOk : ""}`}>{p.sleeping ? "спит 14+ дн." : PARTNER_STATUS[p.status] ?? p.status}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Partner({ d, T, onNote }: { d: PartnerPanel; T: typeof appUz.partnerPanel; onNote: (t: string) => void }) {
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(d.link, { margin: 1, width: 440, color: { dark: "#3b2a1e", light: "#ffffff" } }).then((u) => alive && setQr(u));
    return () => {
      alive = false;
    };
  }, [d.link]);
  async function poster(l: string) {
    if (busy) return;
    haptic.tap();
    setBusy(l);
    try {
      await api("partnerPoster", { lang: l });
      onNote(T.posterSent);
    } catch (e) {
      onNote(e instanceof ApiError && e.code === "tooOften" ? T.posterWait : T.error);
    } finally {
      setBusy(null);
    }
  }
  return (
    <>
      <p className={s.label}>
        {d.name} · {d.label}
      </p>
      {d.pending && <p className={s.hint}>{T.pending}</p>}
      <section className={s.cards} aria-label={T.title}>
        <div className={s.card} data-card="scanned">
          <small>{T.scanned}</small>
          <strong>{d.cards.scanned}</strong>
        </div>
        <div className={s.card} data-card="paid">
          <small>{T.paid}</small>
          <strong>{d.cards.paid}</strong>
        </div>
        <div className={`${s.card} ${s.cardWide}`} data-card="due">
          <small>{T.due}</small>
          <strong>{money(d.cards.due)}</strong>
          <span>
            {T.earned} {money(d.cards.earned)} · {T.paidOut} {money(d.cards.paidOut)}
          </span>
        </div>
      </section>
      <p className={s.hint}>
        {T.rate(rateText(d.rate, d.ratePercent))}
        <br />
        {T.schedule(d.schedule)}
      </p>

      <h2 className={s.h}>{T.payments}</h2>
      {d.payments.length === 0 ? (
        <p className={s.empty}>{T.none}</p>
      ) : (
        <ul className={s.list}>
          {d.payments.map((p) => (
            <li key={p.number} className={s.row} data-payment={p.number}>
              <div className={s.rowHead}>
                <b>
                  №{p.number} · {p.initial}.
                </b>
                <span className={s.amount}>{money(p.amount)}</span>
              </div>
              <p className={s.rowSub}>{day(p.paidAt)}</p>
            </li>
          ))}
        </ul>
      )}

      <h2 className={s.h}>{T.share}</h2>
      <div className={s.row} data-share>
        {/* eslint-disable-next-line @next/next/no-img-element -- QR из data: URL */}
        {qr && <img src={qr} alt="QR" width={220} height={220} style={{ display: "block", margin: "4px auto 10px", borderRadius: 12 }} />}
        <p className={s.rowMain} style={{ wordBreak: "break-all", textAlign: "center" }}>
          {d.link}
        </p>
        <div className={s.rowFoot} style={{ justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className={s.excel} onClick={async () => { if (await copyText(d.link)) { haptic.ok(); onNote(T.copied); } }}>
            {T.copy}
          </button>
          <button type="button" className={s.excel} onClick={() => shareLink(d.link, "InviteIZI")}>
            {T.shareLink}
          </button>
        </div>
      </div>
      <div className={s.rowFoot} style={{ justifyContent: "center", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        {d.posterLangs.map((l) => (
          <button key={l} type="button" className={s.excel} disabled={!!busy} onClick={() => poster(l)}>
            {busy === l ? "…" : T.poster(l === "uz" ? "Ўзбекча" : l === "ru" ? "Русский" : "Қазақша")}
          </button>
        ))}
      </div>
      <p className={s.hint}>{T.posterHint}</p>
    </>
  );
}
