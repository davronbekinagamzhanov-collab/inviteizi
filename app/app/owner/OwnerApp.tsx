"use client";
/**
 * Панель владельца: период, карточки, заказы (поиск и фильтры), партнёры, дизайны, воронка, Excel.
 * Чеки ✅/❌ и экраны: партнёры, менеджеры, выплаты, промокоды, заказ для клиента (OwnerScreens.tsx).
 * Сервер отвечает 403 всем, кто не в ADMIN_IDS.
 */
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ru as BOT_RU, staff as BOT } from "@/texts/bot-ru";
import type { OwnerPanel, OwnerPeriod } from "@/bot/app/owner";
import { api, ApiError } from "../ui/api";
import { haptic, openLink, setupTelegram, tg } from "../ui/telegram";
import { OwnerScreenView, type OwnerScreen } from "./OwnerScreens";
import s from "./owner.module.css";

const PERIODS: { id: OwnerPeriod; label: string }[] = [
  { id: "d", label: "Сегодня" },
  { id: "w", label: "Неделя" },
  { id: "m", label: "Месяц" },
  { id: "y", label: "Год" },
];
const TABS = [
  { id: "receipts", label: "Чеки" },
  { id: "orders", label: "Заказы" },
  { id: "partners", label: "Партнёры" },
  { id: "designs", label: "Дизайны" },
  { id: "funnel", label: "Где уходят" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const STATUS: Record<string, string> = {
  draft: "анкета",
  preview: "НАМУНА",
  awaiting_payment: "на оплате",
  receipt_sent: "чек на проверке",
  active: "оплачен",
  archived: "в архиве",
  rejected: "чек отклонён",
};

const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10,
    m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
};
const money = (n: number) => `${n.toLocaleString("ru-RU").replace(/ /g, " ")} ₸`;
/** «06.11 14:30» по Алматы */
const when = (iso: string) => {
  const d = new Date(+new Date(iso) + 5 * 3_600_000).toISOString();
  return `${d.slice(8, 10)}.${d.slice(5, 7)} ${d.slice(11, 16)}`;
};

type Phase = "boot" | "denied" | "error" | "ready";

export default function OwnerApp({ fontClass }: { fontClass: string }) {
  const [phase, setPhase] = useState<Phase>("boot");
  const [period, setPeriod] = useState<OwnerPeriod>("d");
  const [data, setData] = useState<OwnerPanel | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("receipts");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [partner, setPartner] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [acting, setActing] = useState(false);
  const [screen, setScreen] = useState<OwnerScreen | null>(null);

  function toast(t: string) {
    setNote(t);
    setTimeout(() => setNote(null), 2600);
  }

  /** Действие владельца тем же кодом, что кнопка в боте (✅/❌ чека) */
  async function act(action: string, done: string) {
    if (acting) return;
    haptic.tap();
    setActing(true);
    try {
      await api("ownerAct", { act: action });
      haptic.ok();
      setNote(done);
      setRejecting(null);
      await load(period);
    } catch {
      haptic.error();
      setNote("Не получилось. Попробуйте ещё раз.");
    } finally {
      setActing(false);
      setTimeout(() => setNote(null), 2600);
    }
  }

  const load = useCallback(async (p: OwnerPeriod) => {
    setLoading(true);
    try {
      const r = await api<OwnerPanel>("owner", { period: p });
      setData(r);
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
      if (!tg()?.initData) return setPhase("denied");
      await load("d");
    })();
    return () => {
      alive = false;
    };
  }, [load]);

  function pickPeriod(p: OwnerPeriod) {
    if (p === period) return;
    haptic.select();
    setPeriod(p);
    load(p);
  }

  async function excel() {
    haptic.tap();
    try {
      await api("ownerExport", { period });
      setNote("Файл отправлен в чат с ботом 📥");
    } catch {
      setNote("Не получилось. Попробуйте ещё раз.");
    }
    setTimeout(() => setNote(null), 2600);
  }

  const orders = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase().replace(/^№/, "");
    return data.orders.filter(
      (o) =>
        (!status || (status === "paid" ? o.paid : o.status === status)) &&
        (!partner || (partner === "none" ? !o.partner : String(o.partnerId) === partner)) &&
        (!needle ||
          String(o.number) === needle ||
          [o.names, o.client, o.design].some((x) => x?.toLowerCase().includes(needle))),
    );
  }, [data, q, status, partner]);

  if (phase !== "ready" || !data) {
    return (
      <div className={`${s.root} ${fontClass}`}>
        <p className={s.center}>
          {phase === "boot"
            ? "Загрузка…"
            : phase === "denied"
              ? "Нет доступа. Панель открывается только владельцу из бота."
              : "Ошибка сервера. Закройте и откройте панель ещё раз."}
        </p>
      </div>
    );
  }

  if (screen)
    return (
      <div className={`${s.root} ${fontClass}`} lang="ru">
        <main className={s.wrap}>
          <OwnerScreenView
            screen={screen}
            toast={toast}
            onBack={() => {
              setScreen(null);
              load(period);
            }}
          />
        </main>
        {note && (
          <div className={s.toast} role="status">
            {note}
          </div>
        )}
      </div>
    );

  const c = data.cards;
  return (
    <div className={`${s.root} ${fontClass}`} lang="ru" aria-busy={loading}>
      <header className={s.top}>
        <div className={s.periods} role="tablist" aria-label="Период">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={period === p.id}
              onClick={() => pickPeriod(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </header>

      <main className={s.wrap} style={{ opacity: loading ? 0.55 : 1 }}>
        <p className={s.label}>{data.label}</p>
        <section className={s.cards} aria-label="Итоги">
          <div className={`${s.card} ${s.cardWide}`} data-card="paid">
            <small>Оплачено</small>
            <strong>{money(c.revenue)}</strong>
            <span>
              {c.paid} {plural(c.paid, "заказ", "заказа", "заказов")}
            </span>
          </div>
          <div className={s.card} data-card="namuna">
            <small>НАМУНА без оплаты</small>
            <strong>{c.namuna}</strong>
          </div>
          <div className={s.card} data-card="conversion">
            <small>Конверсия</small>
            <strong>{c.conversion === null ? "—" : `${c.conversion}%`}</strong>
            <span>
              {c.payers} из {c.makers}
            </span>
          </div>
          <div className={`${s.card} ${s.cardWide}`} data-card="due">
            <small>К выплате партнёрам</small>
            <strong>{money(c.due)}</strong>
          </div>
        </section>
        {data.testOrders > 0 && (
          <p className={s.hint} data-test-orders>
            Тестовые заказы админов не учитываются ({data.testOrders})
          </p>
        )}
        {Object.values(data.free).some(Boolean) && (
          <p className={s.hint} data-free-grants>
            Бесплатно выдано: подарок {data.free.gift} · пример {data.free.sample} · наличные {data.free.cash} · замена{" "}
            {data.free.replace}
          </p>
        )}

        <section className={s.actions} aria-label="Действия">
          <Link className={`${s.action} ${s.actionMain}`} href="/app" data-owner-create>
            ✨ Создать приглашение
          </Link>
          {(
            [
              ["partners", "🤝 Партнёры"],
              ["managers", "👤 Менеджеры"],
              ["payouts", "💰 Выплаты"],
              ["promos", "🎟 Промокоды"],
              ["client", "📤 Заказ для клиента"],
            ] as [OwnerScreen, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={s.action}
              data-owner-open={id}
              onClick={() => {
                haptic.tap();
                setScreen(id);
                window.scrollTo(0, 0);
              }}
            >
              {label}
            </button>
          ))}
        </section>

        <nav className={s.tabs} role="tablist" aria-label="Разделы">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => {
                haptic.select();
                setTab(t.id);
              }}
            >
              {t.id === "receipts" && data.receipts.length ? `${t.label} (${data.receipts.length})` : t.label}
            </button>
          ))}
        </nav>

        {tab === "receipts" && (
          <section data-owner-receipts>
            {data.receipts.length === 0 && <p className={s.hint}>{BOT.receiptsNone}</p>}
            {data.receipts.map((r) => (
              <article key={r.number} className={s.receipt}>
                <div>
                  <b>
                    №{r.number} · {money(r.amount)}
                  </b>
                  <span>
                    {r.names ?? "—"} · {r.design}
                  </span>
                  {r.url && (
                    <button type="button" className={s.link} onClick={() => openLink(r.url!)}>
                      Открыть НАМУНА
                    </button>
                  )}
                </div>
                {rejecting === r.number ? (
                  <div className={s.reasons}>
                    {(["money", "sum", "other"] as const).map((code) => (
                      <button
                        key={code}
                        type="button"
                        disabled={acting}
                        onClick={() => act(`nr:${r.number}:${code}`, `❌ №${r.number} отклонён`)}
                      >
                        {BOT_RU.admin.reasons[code]}
                      </button>
                    ))}
                    <button type="button" onClick={() => setRejecting(null)}>
                      Назад
                    </button>
                  </div>
                ) : (
                  <div className={s.decide}>
                    <button
                      type="button"
                      disabled={acting}
                      data-approve
                      onClick={() => act(`ok:${r.number}`, `✅ №${r.number} подтверждён, ссылка отправлена`)}
                    >
                      ✅ Подтвердить
                    </button>
                    <button type="button" disabled={acting} onClick={() => setRejecting(r.number)}>
                      ❌ Отклонить
                    </button>
                  </div>
                )}
              </article>
            ))}
          </section>
        )}

        {tab === "orders" && (
          <section>
            <input
              className={s.search}
              type="search"
              inputMode="search"
              placeholder="№, имя, дизайн"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Поиск заказа"
            />
            <div className={s.filters}>
              <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Статус">
                <option value="">Все статусы</option>
                <option value="paid">Оплаченные</option>
                {Object.entries(STATUS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <select value={partner} onChange={(e) => setPartner(e.target.value)} aria-label="Партнёр">
                <option value="">Все партнёры</option>
                <option value="none">Без партнёра</option>
                {data.partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <p className={s.count}>
              {orders.length} из {data.ordersTotal}
            </p>
            {orders.length === 0 ? (
              <p className={s.empty}>Заказов нет</p>
            ) : (
              <ul className={s.list}>
                {orders.map((o) => (
                  <li key={o.number} className={s.row} data-order={o.number}>
                    <div className={s.rowHead}>
                      <b>№{o.number}</b>
                      <span className={s.amount}>{money(o.amount)}</span>
                    </div>
                    <p className={s.rowMain}>{o.names || o.client}</p>
                    <p className={s.rowSub}>
                      {when(o.createdAt)} · {o.design}
                      {o.partner ? ` · ${o.partner}` : ""}
                    </p>
                    <div className={s.rowFoot}>
                      <span className={`${s.badge} ${o.paid ? s.badgeOk : ""}`}>{STATUS[o.status] ?? o.status}</span>
                      {o.url && (
                        <button type="button" className={s.link} onClick={() => openLink(o.url!)}>
                          Открыть ↗
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {tab === "partners" && (
          <section>
            {data.partners.length === 0 ? (
              <p className={s.empty}>Партнёров пока нет</p>
            ) : (
              <ul className={s.list}>
                {data.partners.map((p) => (
                  <li key={p.id} className={s.row} data-partner={p.id}>
                    <div className={s.rowHead}>
                      <b className={s.ellipsis}>{p.name}</b>
                      <span className={s.amount}>{p.rate}</span>
                    </div>
                    <p className={s.rowSub}>
                      {p.manager ? `Привёл: ${p.manager}` : "Партнёр владельца"}
                      {p.status === "pending" ? " · ждёт ✅" : ""}
                      {p.sleeping ? " · 😴 спит" : ""}
                    </p>
                    <dl className={s.grid}>
                      <div>
                        <dt>Сканы</dt>
                        <dd>{p.scanned}</dd>
                      </div>
                      <div>
                        <dt>Оплаты</dt>
                        <dd>{p.paid}</dd>
                      </div>
                      <div>
                        <dt>Начислено</dt>
                        <dd>{money(p.earned)}</dd>
                      </div>
                      <div>
                        <dt>Выплачено</dt>
                        <dd>{money(p.paidOut)}</dd>
                      </div>
                      <div>
                        <dt>Долг</dt>
                        <dd className={p.due > 0 ? s.debt : ""}>{money(p.due + p.onHold)}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {tab === "designs" && (
          <section>
            {data.designs.length === 0 ? (
              <p className={s.empty}>За период заказов нет</p>
            ) : (
              <ol className={s.rating}>
                {data.designs.map((d, i) => (
                  <li key={d.id}>
                    <span className={s.place}>{i + 1}</span>
                    <span className={s.ellipsis}>
                      №{d.number} {d.name}
                    </span>
                    <span className={s.nums}>
                      <b>{d.paid}</b> опл. · {d.samples} НАМУНА
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}

        {tab === "funnel" && (
          <section className={s.funnel}>
            {[
              { label: "Новые клиенты", n: data.funnel.clients },
              { label: "Сделали НАМУНА", n: data.funnel.makers },
              { label: "Оплатили", n: data.funnel.payers },
            ].map((x) => (
              <div key={x.label} className={s.step}>
                <div className={s.stepHead}>
                  <span>{x.label}</span>
                  <b>{x.n}</b>
                </div>
                <div className={s.bar}>
                  <i
                    style={{
                      width: `${Math.min(100, Math.round((x.n / Math.max(1, data.funnel.clients, data.funnel.makers)) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            ))}
            {data.funnel.stuck.length > 0 && (
              <>
                <h3 className={s.h3}>Остановились на шаге</h3>
                <ul className={s.stuck}>
                  {data.funnel.stuck.map((x) => (
                    <li key={x.step}>
                      <span>{x.label}</span>
                      <b>{x.count}</b>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

        <button type="button" className={s.excel} onClick={excel}>
          📤 Excel
        </button>
      </main>
      {note && (
        <div className={s.toast} role="status">
          {note}
        </div>
      )}
    </div>
  );
}
