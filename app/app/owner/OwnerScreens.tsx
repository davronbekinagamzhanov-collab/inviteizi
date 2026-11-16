"use client";
/**
 * Экраны админки владельца внутри Mini App (17.11.2026): партнёры, менеджеры, выплаты, промокоды, заказ для клиента.
 * Права проверяет сервер по initData (не админу — 403); здесь только интерфейс.
 */
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { AdminPartner, AdminPromotion } from "@/bot/app/owner-admin";
import { api, ApiError } from "../ui/api";
import { copyText, haptic, openLink } from "../ui/telegram";
import s from "./owner.module.css";

export type OwnerScreen = "partners" | "managers" | "payouts" | "promos" | "client" | "promotions" | "wholesale";

const money = (n: number) => `${n.toLocaleString("ru-RU").replace(/ /g, " ")} ₸`;
const day = (iso: string) => {
  const d = new Date(+new Date(iso) + 5 * 3_600_000).toISOString();
  return `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`;
};
const SCHEDULE = { daily: "каждый день", weekly: "раз в неделю", monthly: "раз в месяц" } as const;
type Schedule = keyof typeof SCHEDULE;
const ERR: Record<string, string> = {
  forbidden: "Нет доступа",
  bad: "Проверьте поля",
  notFound: "Не найдено — обновите список",
  stale: "Сумма уже изменилась — список обновлён",
  exists: "Такой код уже есть",
  disabled: "Промокоды ещё не подключены к базе",
  offline: "Нет интернета",
};
const errText = (e: unknown) => (e instanceof ApiError ? (ERR[e.code] ?? "Ошибка сервера") : "Ошибка сервера");
const rateLabel = (p: Pick<AdminPartner, "rate" | "ratePercent" | "paused">) =>
  p.paused ? "приостановлен" : p.ratePercent != null ? `${p.ratePercent}%` : money(p.rate);

/** Загрузка списка экрана + повтор после действия */
function useList<T>(action: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    try {
      setData(await api<T>(action));
      setError(null);
    } catch (e) {
      setError(errText(e));
    }
  }, [action]);
  useEffect(() => {
    let alive = true;
    api<T>(action).then(
      (r) => alive && setData(r),
      (e) => alive && setError(errText(e)),
    );
    return () => {
      alive = false;
    };
  }, [action]);
  return { data, error, reload };
}

/** Готовая ссылка: копировать, WhatsApp */
function ShareLink({ link, waUz, waRu, note }: { link: string; waUz?: string; waRu?: string; note: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={s.shareBox} data-share-link>
      <p className={s.hint}>{note}</p>
      <code className={s.code}>{link}</code>
      <div className={s.decide}>
        <button
          type="button"
          onClick={async () => {
            if (await copyText(link)) {
              haptic.ok();
              setCopied(true);
            }
          }}
        >
          {copied ? "Скопировано ✓" : "Копировать"}
        </button>
        {waUz && (
          <button type="button" onClick={() => openLink(waUz)}>
            WhatsApp уз
          </button>
        )}
        {waRu && (
          <button type="button" onClick={() => openLink(waRu)}>
            WhatsApp ру
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className={s.field}>
      <span>{label}</span>
      {children}
    </label>
  );
}

/** Ставка: «15%» или «1000» (₸); 0 — только счёт */
function RateFields({
  rate,
  schedule,
  onRate,
  onSchedule,
}: {
  rate: string;
  schedule: Schedule;
  onRate: (v: string) => void;
  onSchedule: (v: Schedule) => void;
}) {
  return (
    <>
      <Field label="Ставка: 15% или 1000 ₸">
        <input className={s.search} value={rate} onChange={(e) => onRate(e.target.value)} inputMode="text" />
      </Field>
      <div className={s.reasons} role="radiogroup" aria-label="График выплат">
        {(Object.keys(SCHEDULE) as Schedule[]).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={schedule === k} onClick={() => onSchedule(k)}>
            {SCHEDULE[k]}
          </button>
        ))}
      </div>
    </>
  );
}

// ── Партнёры ──

function PartnerCard({ p, onDone, toast }: { p: AdminPartner; onDone: () => void; toast: (t: string) => void }) {
  const [open, setOpen] = useState(false);
  const [rate, setRate] = useState(p.ratePercent != null ? `${p.ratePercent}%` : String(p.rate));
  const [schedule, setSchedule] = useState<Schedule>(p.schedule);
  const [busy, setBusy] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [link, setLink] = useState<{ link: string; waUz: string; waRu: string } | null>(null);

  async function run(action: string, body: Record<string, unknown>, done: string) {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api<{ link?: string; waUz?: string; waRu?: string }>(action, { id: p.id, ...body });
      haptic.ok();
      toast(done);
      if (r.link) setLink({ link: r.link, waUz: r.waUz!, waRu: r.waRu! });
      setPausing(false);
      onDone();
    } catch (e) {
      haptic.error();
      toast(errText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className={s.row} data-partner={p.id}>
      <button type="button" className={s.rowButton} onClick={() => setOpen(!open)} aria-expanded={open}>
        <div className={s.rowHead}>
          <b className={s.ellipsis}>{p.name}</b>
          <span className={s.amount}>{rateLabel(p)}</span>
        </div>
        <p className={s.rowSub}>
          {p.phone ?? "без телефона"} ·{" "}
          {p.status === "pending" ? "ждёт ✅" : p.joined ? "подключён" : "ссылка не открыта"}
          {p.manager ? ` · ${p.manager}` : ""}
        </p>
        <dl className={s.grid}>
          <div>
            <dt>Продажи</dt>
            <dd>{p.sales}</dd>
          </div>
          <div>
            <dt>Начислено</dt>
            <dd>{money(p.earned)}</dd>
          </div>
          <div>
            <dt>К выплате</dt>
            <dd className={p.due > 0 ? s.debt : ""}>{money(p.due + p.onHold)}</dd>
          </div>
        </dl>
      </button>
      {open && (
        <div className={s.editBox}>
          <RateFields rate={rate} schedule={schedule} onRate={setRate} onSchedule={setSchedule} />
          <button
            type="button"
            className={`${s.action} ${s.actionMain}`}
            disabled={busy}
            onClick={() => run("ownerPartnerTerms", { rate, schedule }, "Условия сохранены (для новых заказов)")}
          >
            Сохранить условия
          </button>
          {!p.paused &&
            (pausing ? (
              <div className={s.decide}>
                <button
                  type="button"
                  data-approve
                  disabled={busy}
                  onClick={() => run("ownerPartnerPause", {}, "Партнёр приостановлен")}
                >
                  Да, приостановить
                </button>
                <button type="button" onClick={() => setPausing(false)}>
                  Нет
                </button>
              </div>
            ) : (
              <button type="button" className={s.action} onClick={() => setPausing(true)}>
                ⏸ Приостановить (без начислений)
              </button>
            ))}
          {p.paused && <p className={s.hint}>Приостановлен: новых начислений нет. Вернуть — сохраните новую ставку.</p>}
          {!p.joined && (
            <button
              type="button"
              className={s.action}
              disabled={busy}
              onClick={() => run("ownerPartnerLink", {}, "Новая ссылка готова")}
            >
              🔗 Новая ссылка join_
            </button>
          )}
          {link && <ShareLink {...link} note="Одноразовая ссылка, 7 дней. Отправьте партнёру." />}
          {p.joined && <WholesaleAssign target={{ partnerId: p.id }} toast={toast} />}
        </div>
      )}
    </li>
  );
}

function NewPartner({ onDone, toast }: { onDone: () => void; toast: (t: string) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [rate, setRate] = useState("15%");
  const [schedule, setSchedule] = useState<Schedule>("weekly");
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<{ link: string; waUz: string; waRu: string } | null>(null);

  async function create() {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api<{ link: string; waUz: string; waRu: string }>("ownerPartnerNew", {
        name,
        phone,
        rate,
        schedule,
      });
      haptic.ok();
      setLink(r);
      onDone();
    } catch (e) {
      haptic.error();
      toast(errText(e));
    } finally {
      setBusy(false);
    }
  }

  if (link)
    return (
      <div className={s.editBox} data-new-partner-link>
        <b>Партнёр «{name}» создан</b>
        <ShareLink
          {...link}
          note="Партнёр открывает ссылку в Telegram — подключается сам. Ссылка одноразовая, 7 дней."
        />
      </div>
    );
  return (
    <div className={s.editBox} data-new-partner>
      <Field label="Имя или название">
        <input className={s.search} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
      </Field>
      <Field label="Телефон">
        <input
          className={s.search}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
          placeholder="+7 701 123 45 67"
        />
      </Field>
      <RateFields rate={rate} schedule={schedule} onRate={setRate} onSchedule={setSchedule} />
      <button type="button" className={`${s.action} ${s.actionMain}`} disabled={busy} onClick={create}>
        Создать ссылку join_
      </button>
    </div>
  );
}

function Partners({ toast }: { toast: (t: string) => void }) {
  const { data, error, reload } = useList<{ ready: boolean; partners: AdminPartner[] }>("ownerPartners");
  const [adding, setAdding] = useState(false);
  return (
    <>
      <button type="button" className={`${s.action} ${s.actionMain}`} onClick={() => setAdding(!adding)}>
        {adding ? "Закрыть" : "🤝 Новый партнёр"}
      </button>
      {adding && <NewPartner onDone={reload} toast={toast} />}
      <Status error={error} loading={!data} />
      {data && !data.ready && <p className={s.hint}>Таблица партнёров ещё не создана в базе.</p>}
      {data?.partners.length === 0 && <p className={s.empty}>Партнёров пока нет</p>}
      <ul className={s.list}>
        {data?.partners.map((p) => (
          <PartnerCard key={p.id} p={p} onDone={reload} toast={toast} />
        ))}
      </ul>
    </>
  );
}

// ── Менеджеры ──

function Managers({ toast }: { toast: (t: string) => void }) {
  const { data, error, reload } = useList<{
    managers: { id: number; name: string; since: string; partners: number }[];
  }>("ownerManagers");
  const [link, setLink] = useState<string | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: string, body: Record<string, unknown>, done: string) {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api<{ link?: string }>(action, body);
      haptic.ok();
      if (r.link) setLink(r.link);
      toast(done);
      setRemoving(null);
      await reload();
    } catch (e) {
      haptic.error();
      toast(errText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={`${s.action} ${s.actionMain}`}
        disabled={busy}
        onClick={() => run("ownerManagerInvite", {}, "Ссылка готова")}
      >
        👤 Пригласить менеджера
      </button>
      {link && <ShareLink link={link} note="Одноразовая ссылка mgr_. Отправьте только своему человеку." />}
      <Status error={error} loading={!data} />
      {data?.managers.length === 0 && <p className={s.empty}>Менеджеров пока нет</p>}
      <ul className={s.list}>
        {data?.managers.map((m) => (
          <li key={m.id} className={s.row} data-manager={m.id}>
            <div className={s.rowHead}>
              <b className={s.ellipsis}>{m.name}</b>
              <span className={s.amount}>{m.partners} парт.</span>
            </div>
            <p className={s.rowSub}>с {day(m.since)}</p>
            {removing === m.id ? (
              <div className={s.decide}>
                <button
                  type="button"
                  data-approve
                  disabled={busy}
                  onClick={() => run("ownerManagerRemove", { id: m.id }, "Роль снята")}
                >
                  Да, снять роль
                </button>
                <button type="button" onClick={() => setRemoving(null)}>
                  Нет
                </button>
              </div>
            ) : (
              <button type="button" className={s.link} onClick={() => setRemoving(m.id)}>
                Снять роль
              </button>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

// ── Выплаты ──

type Payouts = {
  due: { id: number; name: string; amount: number; kaspi: string | null; phone: string | null; version: number }[];
  history: { name: string; amount: number; at: string }[];
};

function PayoutsScreen({ toast }: { toast: (t: string) => void }) {
  const { data, error, reload } = useList<Payouts>("ownerPayouts");
  const [confirming, setConfirming] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function mark(row: Payouts["due"][number]) {
    if (busy) return;
    setBusy(true);
    try {
      await api("ownerPayoutMark", { id: row.id, amount: row.amount, version: row.version });
      haptic.ok();
      toast(`Выплачено ${money(row.amount)} — партнёру сообщили`);
    } catch (e) {
      haptic.error();
      toast(errText(e));
    } finally {
      setConfirming(null);
      setBusy(false);
      await reload();
    }
  }

  return (
    <>
      <Status error={error} loading={!data} />
      {data?.due.length === 0 && <p className={s.empty}>Сейчас никому не нужно платить</p>}
      <ul className={s.list}>
        {data?.due.map((r) => (
          <li key={r.id} className={s.row} data-payout={r.id}>
            <div className={s.rowHead}>
              <b className={s.ellipsis}>{r.name}</b>
              <span className={`${s.amount} ${s.debt}`}>{money(r.amount)}</span>
            </div>
            <p className={s.rowSub}>Куда: {r.kaspi ?? r.phone ?? "реквизиты не указаны"}</p>
            {confirming === r.id ? (
              <div className={s.decide}>
                <button type="button" data-approve disabled={busy} onClick={() => mark(r)}>
                  Да, перевёл {money(r.amount)}
                </button>
                <button type="button" onClick={() => setConfirming(null)}>
                  Нет
                </button>
              </div>
            ) : (
              <div className={s.decide}>
                <button type="button" onClick={() => setConfirming(r.id)}>
                  ✅ Выплачено
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {data && data.history.length > 0 && (
        <>
          <h3 className={s.h3}>История</h3>
          <ul className={s.stuck}>
            {data.history.map((h, i) => (
              <li key={i}>
                <span className={s.ellipsis}>
                  {day(h.at)} · {h.name}
                </span>
                <b>{money(h.amount)}</b>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

// ── Промокоды ──

type Promo = {
  code: string;
  name: string;
  percent: number;
  limit: number;
  used: number;
  reserved: number;
  enabled: boolean;
  expiresAt: string | null;
};

function Promos({ toast }: { toast: (t: string) => void }) {
  const { data, error, reload } = useList<{ ready: boolean; enabled: boolean; promos: Promo[] }>("ownerPromos");
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("10");
  const [limit, setLimit] = useState("20");
  const [expires, setExpires] = useState("");
  const [busy, setBusy] = useState(false);
  const [off, setOff] = useState<string | null>(null);

  async function run(action: string, body: Record<string, unknown>, done: string) {
    if (busy) return;
    setBusy(true);
    try {
      await api(action, body);
      haptic.ok();
      toast(done);
      setOff(null);
      if (action === "ownerPromoCreate") setCode("");
      await reload();
    } catch (e) {
      haptic.error();
      toast(errText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Status error={error} loading={!data} />
      {data && !data.ready && <p className={s.hint}>Промокоды ещё не подключены к базе (миграция маркетинга).</p>}
      {data?.ready && !data.enabled && (
        <p className={s.hint} data-promos-off>
          ⚠️ Промокоды выключены: клиенты не смогут ввести код (нет кнопки «🎟 Промокод»). Включается флагами
          MARKETING_AUTOMATION_ENABLED и MARKETING_PROMOS_ENABLED. Создать код заранее можно.
        </p>
      )}
      {data?.ready && (
        <div className={s.editBox} data-promo-new>
          <Field label="Код (латиница и цифры)">
            <input
              className={s.search}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
              maxLength={32}
              placeholder="TOY10"
            />
          </Field>
          <div className={s.filters}>
            <Field label="Скидка, %">
              <input
                className={s.search}
                value={percent}
                onChange={(e) => setPercent(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
              />
            </Field>
            <Field label="Лимит">
              <input
                className={s.search}
                value={limit}
                onChange={(e) => setLimit(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
              />
            </Field>
          </div>
          <Field label="Действует до (необязательно)">
            <input className={s.search} type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
          </Field>
          <button
            type="button"
            className={`${s.action} ${s.actionMain}`}
            disabled={busy || code.length < 3}
            onClick={() =>
              run(
                "ownerPromoCreate",
                { code, percent: Number(percent), limit: Number(limit), expires: expires || null },
                data.enabled
                  ? `Промокод ${code} создан`
                  : `Промокод ${code} создан, но промокоды выключены — клиенты не смогут ввести`,
              )
            }
          >
            🎟 Создать промокод
          </button>
        </div>
      )}
      {data?.ready && data.promos.length === 0 && <p className={s.empty}>Промокодов пока нет</p>}
      <ul className={s.list}>
        {data?.promos.map((p) => (
          <li key={p.code} className={s.row} data-promo={p.code}>
            <div className={s.rowHead}>
              <b>{p.code}</b>
              <span className={s.amount}>−{p.percent}%</span>
            </div>
            <p className={s.rowSub}>
              использовано {p.used} из {p.limit}
              {p.reserved ? ` · ждут оплаты ${p.reserved}` : ""}
              {p.expiresAt ? ` · до ${day(p.expiresAt)}` : " · без срока"}
            </p>
            <div className={s.rowFoot}>
              <span className={`${s.badge} ${p.enabled ? s.badgeOk : ""}`}>{p.enabled ? "вкл" : "выкл"}</span>
              {p.enabled &&
                (off === p.code ? (
                  <div className={s.decide}>
                    <button
                      type="button"
                      data-approve
                      disabled={busy}
                      onClick={() => run("ownerPromoDisable", { code: p.code }, `${p.code} выключен`)}
                    >
                      Да, выключить
                    </button>
                    <button type="button" onClick={() => setOff(null)}>
                      Нет
                    </button>
                  </div>
                ) : (
                  <button type="button" className={s.link} onClick={() => setOff(p.code)}>
                    Выключить
                  </button>
                ))}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

// ── Заказ для клиента ──

type ClientOrder = { id: string; number: number; amount: number; design: string; names: string | null; url: string };
const REASONS = { gift: "Подарок", sample: "Пример", cash: "Наличные", replace: "Замена" } as const;

function ClientOrderRow({ o, onDone, toast }: { o: ClientOrder; onDone: () => void; toast: (t: string) => void }) {
  const [mode, setMode] = useState<null | "free">(null);
  const [busy, setBusy] = useState(false);
  const [share, setShare] = useState<{ link: string; waUz: string; waRu: string } | null>(null);

  async function waiting() {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api<{ bot: string; waUz: string; waRu: string }>("ownerClientLink", { orderId: o.id });
      haptic.ok();
      setShare({ link: r.bot, waUz: r.waUz, waRu: r.waRu });
    } catch (e) {
      haptic.error();
      toast(errText(e));
    } finally {
      setBusy(false);
    }
  }

  async function free(reason: keyof typeof REASONS) {
    if (busy) return;
    setBusy(true);
    try {
      await api("freeIssue", { orderId: o.id, reason });
      haptic.ok();
      toast(`№${o.number} выдан бесплатно — ссылка в чате с ботом`);
      onDone();
    } catch (e) {
      haptic.error();
      toast(errText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className={s.row} data-client-order={o.number}>
      <div className={s.rowHead}>
        <b>№{o.number}</b>
        <span className={s.amount}>{money(o.amount)}</span>
      </div>
      <p className={s.rowMain}>{o.names || "—"}</p>
      <p className={s.rowSub}>
        {o.design} ·{" "}
        <button type="button" className={s.link} onClick={() => openLink(o.url)}>
          Образец ↗
        </button>
      </p>
      {share ? (
        <ShareLink
          {...share}
          note="Ждёт оплату: клиент открывает ссылку, заказ переходит к нему, дальше обычная оплата и чек."
        />
      ) : mode === "free" ? (
        <div className={s.reasons} aria-label="Причина">
          {(Object.keys(REASONS) as (keyof typeof REASONS)[]).map((r) => (
            <button key={r} type="button" disabled={busy} onClick={() => free(r)}>
              {REASONS[r]}
            </button>
          ))}
          <button type="button" onClick={() => setMode(null)}>
            Назад
          </button>
        </div>
      ) : (
        <div className={s.decide}>
          <button type="button" data-approve disabled={busy} onClick={waiting}>
            📤 Клиенту · ждёт оплату
          </button>
          <button type="button" disabled={busy} onClick={() => setMode("free")}>
            🎁 Бесплатно
          </button>
        </div>
      )}
    </li>
  );
}

function ClientOrders({ toast }: { toast: (t: string) => void }) {
  const { data, error, reload } = useList<{ orders: ClientOrder[] }>("ownerClientOrders");
  return (
    <>
      <p className={s.hint}>
        1) Заполните приглашение за клиента. 2) Здесь выберите: ссылка клиенту (он оплатит сам) или бесплатно с
        причиной.
      </p>
      <Link className={`${s.action} ${s.actionMain}`} href="/app" data-client-fill>
        ✨ Заполнить приглашение
      </Link>
      <Status error={error} loading={!data} />
      {data?.orders.length === 0 && <p className={s.empty}>Неоплаченных приглашений нет</p>}
      <ul className={s.list}>
        {data?.orders.map((o) => (
          <ClientOrderRow key={o.id} o={o} onDone={reload} toast={toast} />
        ))}
      </ul>
    </>
  );
}

// ── Акции ──

const OCC = { nikoh: "Никоҳ", nahorgi: "Наҳорги ош", sunnat: "Суннат", yubiley: "Юбилей" } as const;
const FMT = { animated: "Анимация", scroll: "Листаемый", simple: "Простой" } as const;
const STATE: Record<AdminPromotion["state"], string> = {
  running: "идёт",
  planned: "запланирована",
  ended: "закончилась",
  stopped: "остановлена",
};
/** «2026-11-20T18:00» по Алматы */
const localInput = (d: Date) => new Date(+d + 5 * 3_600_000).toISOString().slice(0, 16);
const dayTime = (iso: string) => {
  const d = new Date(+new Date(iso) + 5 * 3_600_000).toISOString();
  return `${d.slice(8, 10)}.${d.slice(5, 7)} ${d.slice(11, 16)}`;
};

function Picks<K extends string>({
  all,
  value,
  onChange,
  label,
}: {
  all: Record<K, string>;
  value: K[] | null;
  onChange: (v: K[] | null) => void;
  label: string;
}) {
  const keys = Object.keys(all) as K[];
  const on = (k: K) => value === null || value.includes(k);
  return (
    <div className={s.reasons} role="group" aria-label={label}>
      <button type="button" role="checkbox" aria-checked={value === null} onClick={() => onChange(null)}>
        Все
      </button>
      {keys.map((k) => (
        <button
          key={k}
          type="button"
          role="checkbox"
          aria-checked={value !== null && on(k)}
          onClick={() => {
            const cur = value ?? [];
            const next = cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k];
            onChange(next.length === 0 || next.length === keys.length ? null : next);
          }}
        >
          {all[k]}
        </button>
      ))}
    </div>
  );
}

function NewPromotion({ onDone, toast }: { onDone: (id: string | null) => void; toast: (t: string) => void }) {
  const [name, setName] = useState("");
  const [percent, setPercent] = useState("20");
  const [start, setStart] = useState(() => localInput(new Date()));
  const [end, setEnd] = useState(() => localInput(new Date(Date.now() + 7 * 86_400_000)));
  const [occasions, setOccasions] = useState<(keyof typeof OCC)[] | null>(null);
  const [formats, setFormats] = useState<(keyof typeof FMT)[] | null>(null);
  const [partners, setPartners] = useState(false);
  // Рассылка клиентам и «Охирги кун!» за 24 ч — по умолчанию включены
  const [send, setSend] = useState(true);
  const [remind, setRemind] = useState(true);
  const [busy, setBusy] = useState(false);
  const pct = Number(percent);
  async function create() {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api<{ id: string }>("ownerPromotionCreate", {
        name,
        percent: pct,
        startsAt: start,
        endsAt: end,
        occasions,
        formats,
        forPartnerClients: partners,
        broadcast: send,
        remind,
      });
      haptic.ok();
      toast(send ? "Акция создана — проверьте сообщение перед рассылкой" : "Акция создана");
      onDone(send ? r.id : null);
    } catch (e) {
      haptic.error();
      toast(
        e instanceof ApiError && e.code === "exists" ? "Уже есть акция на эти дни — сначала остановите её" : errText(e),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={s.editBox} data-promotion-new>
      <Field label="Название (видят клиенты)">
        <input
          className={s.search}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder="Куз чегирмаси"
        />
      </Field>
      <Field label="Скидка, % (100 = бесплатно)">
        <input
          className={s.search}
          value={percent}
          onChange={(e) => setPercent(e.target.value.replace(/\D/g, "").slice(0, 3))}
          inputMode="numeric"
        />
      </Field>
      <div className={s.filters}>
        <Field label="Начало">
          <input className={s.search} type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="Конец">
          <input className={s.search} type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
        </Field>
      </div>
      <Picks all={OCC} value={occasions} onChange={setOccasions} label="Тадбиры" />
      <Picks all={FMT} value={formats} onChange={setFormats} label="Форматы" />
      <label className={s.check}>
        <input type="checkbox" checked={partners} onChange={(e) => setPartners(e.target.checked)} />
        <span>Клиентам, которые пришли по ссылке партнёра</span>
      </label>
      <label className={s.check}>
        <input type="checkbox" checked={send} onChange={(e) => setSend(e.target.checked)} data-broadcast-toggle />
        <span>Разослать клиентам (предпросмотр и число получателей — перед отправкой)</span>
      </label>
      <label className={s.check}>
        <input type="checkbox" checked={remind} onChange={(e) => setRemind(e.target.checked)} />
        <span>Напомнить «Охирги кун!» за 24 часа до конца</span>
      </label>
      <p className={s.hint}>
        Не действует для партнёров, менеджеров, оптовиков и админов. С промокодом не складывается — берётся бо́льшая
        скидка.
      </p>
      <button
        type="button"
        className={`${s.action} ${s.actionMain}`}
        disabled={busy || !name.trim() || !(pct >= 1 && pct <= 100)}
        onClick={create}
      >
        🎉 Запустить акцию
      </button>
    </div>
  );
}

/** Предпросмотр рассылки: картинка, текст (уз/ру), кнопки, число получателей → «Отправить» с подтверждением */
function BroadcastPreview({ id, toast, onClose }: { id: string; toast: (t: string) => void; onClose: () => void }) {
  const [data, setData] = useState<{
    recipients: number;
    photo: string | null;
    uz: string;
    ru: string;
    buttons: string[];
    sentAt: string | null;
  } | null>(null);
  const [lang, setLang] = useState<"uz" | "ru">("uz");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    api<NonNullable<typeof data>>("ownerBroadcastPreview", { id }).then(
      (r) => alive && setData(r),
      (e) => alive && toast(errText(e)),
    );
    return () => {
      alive = false;
    };
  }, [id, toast]);
  async function sendNow() {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api<{ queued: number }>("ownerBroadcastStart", { id });
      haptic.ok();
      toast(`Рассылка запущена: ${r.queued} получателей`);
      onClose();
    } catch (e) {
      haptic.error();
      toast(
        e instanceof ApiError && e.code === "stale"
          ? "Рассылка уже была или прошло меньше 3 дней с прошлой"
          : errText(e),
      );
    } finally {
      setBusy(false);
    }
  }
  if (!data) return <p className={s.hint}>Загрузка предпросмотра…</p>;
  return (
    <div className={s.editBox} data-broadcast-preview>
      <b>Предпросмотр сообщения</b>
      <div className={s.reasons} role="radiogroup" aria-label="Язык">
        {(["uz", "ru"] as const).map((l) => (
          <button key={l} type="button" role="radio" aria-checked={lang === l} onClick={() => setLang(l)}>
            {l === "uz" ? "Ўзбекча" : "Русский"}
          </button>
        ))}
      </div>
      {data.photo && (
        // eslint-disable-next-line @next/next/no-img-element -- обложка дизайна, готовый JPG
        <img src={data.photo} alt="" className={s.previewImg} />
      )}
      <p className={s.previewText}>{lang === "uz" ? data.uz : data.ru}</p>
      <div className={s.decide}>
        {data.buttons.map((b) => (
          <button key={b} type="button" disabled>
            {b}
          </button>
        ))}
      </div>
      <p className={s.hint} data-broadcast-count>
        Получателей: {data.recipients}. Без админов, менеджеров, партнёров, оптовиков и тех, кто отключил сообщения.
        Отправка — 25 сообщений в секунду.
      </p>
      <div className={s.decide}>
        <button
          type="button"
          data-approve
          disabled={busy || !data.recipients || Boolean(data.sentAt)}
          onClick={sendNow}
        >
          📣 Отправить {data.recipients}
        </button>
        <button type="button" onClick={onClose}>
          Позже
        </button>
      </div>
    </div>
  );
}

function Promotions({ toast }: { toast: (t: string) => void }) {
  const { data, error, reload } = useList<{ promotions: AdminPromotion[] }>("ownerPromotions");
  const [adding, setAdding] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [stopping, setStopping] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function stop(id: string) {
    if (busy) return;
    setBusy(true);
    try {
      await api("ownerPromotionStop", { id });
      haptic.ok();
      toast("Акция остановлена — цены снова обычные");
      setStopping(null);
      await reload();
    } catch (e) {
      haptic.error();
      toast(errText(e));
    } finally {
      setBusy(false);
    }
  }
  const live = data?.promotions.some((p) => p.state === "running" || p.state === "planned");
  return (
    <>
      {!live && (
        <button type="button" className={`${s.action} ${s.actionMain}`} onClick={() => setAdding(!adding)}>
          {adding ? "Закрыть" : "🎉 Новая акция"}
        </button>
      )}
      {adding && !live && (
        <NewPromotion
          toast={toast}
          onDone={(id) => {
            setAdding(false);
            setPreview(id);
            reload();
          }}
        />
      )}
      {preview && (
        <BroadcastPreview
          id={preview}
          toast={toast}
          onClose={() => {
            setPreview(null);
            reload();
          }}
        />
      )}
      <Status error={error} loading={!data} />
      {data?.promotions.length === 0 && <p className={s.empty}>Акций пока не было</p>}
      <ul className={s.list}>
        {data?.promotions.map((p) => (
          <li key={p.id} className={s.row} data-promotion={p.state}>
            <div className={s.rowHead}>
              <b className={s.ellipsis}>{p.name}</b>
              <span className={`${s.amount} ${s.debt}`}>{p.percent >= 100 ? "бесплатно" : `−${p.percent}%`}</span>
            </div>
            <p className={s.rowSub}>
              {dayTime(p.startsAt)} — {dayTime(p.endsAt)} ·{" "}
              {p.occasions ? p.occasions.map((o) => OCC[o]).join(", ") : "все тадбиры"} ·{" "}
              {p.formats ? p.formats.map((f) => FMT[f]).join(", ") : "все форматы"}
              {p.forPartnerClients ? " · и клиентам партнёров" : ""}
            </p>
            <p className={s.rowSub}>
              Заказов: {p.orders} на {money(p.sum)}
              {p.free ? ` · бесплатно ${p.free}` : ""}
            </p>
            {p.broadcastAt && (
              <p className={s.rowSub} data-broadcast-progress>
                Рассылка: отправлено {p.progress.sent}
                {p.progress.queued ? ` · в очереди ${p.progress.queued}` : ""} · заблокировали {p.progress.blocked} ·
                ошибки {p.progress.failed}
                {p.remindAt
                  ? " · «Охирги кун!» ушло"
                  : p.remind && (p.state === "running" || p.state === "planned")
                    ? " · «Охирги кун!» — за 24 ч"
                    : ""}
              </p>
            )}
            {p.broadcast && !p.broadcastAt && (p.state === "running" || p.state === "planned") && preview !== p.id && (
              <button type="button" className={s.link} onClick={() => setPreview(p.id)} data-broadcast-open>
                📣 Разослать клиентам
              </button>
            )}
            <div className={s.rowFoot}>
              <span className={`${s.badge} ${p.state === "running" ? s.badgeOk : ""}`}>{STATE[p.state]}</span>
              {(p.state === "running" || p.state === "planned") &&
                (stopping === p.id ? (
                  <div className={s.decide}>
                    <button type="button" data-approve disabled={busy} onClick={() => stop(p.id)}>
                      Да, остановить
                    </button>
                    <button type="button" onClick={() => setStopping(null)}>
                      Нет
                    </button>
                  </div>
                ) : (
                  <button type="button" className={s.link} onClick={() => setStopping(p.id)}>
                    Остановить
                  </button>
                ))}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

// ── Оптовики ──

/** «Назначить оптовиком»: скидка % и кнопка. target — партнёр, № заказа клиента */
export function WholesaleAssign({
  target,
  toast,
  onDone,
}: {
  target: { partnerId: number } | { orderNumber: number };
  toast: (t: string) => void;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [percent, setPercent] = useState("15");
  const [busy, setBusy] = useState(false);
  if (!open)
    return (
      <button type="button" className={s.link} onClick={() => setOpen(true)} data-wholesale-open>
        🏷 Назначить оптовиком
      </button>
    );
  return (
    <div className={s.decide} data-wholesale-assign>
      <input
        className={s.search}
        style={{ flex: "0 1 90px" }}
        value={percent}
        onChange={(e) => setPercent(e.target.value.replace(/\D/g, "").slice(0, 2))}
        inputMode="numeric"
        aria-label="Скидка оптовика, %"
      />
      <button
        type="button"
        data-approve
        disabled={busy || !(Number(percent) >= 1 && Number(percent) <= 90)}
        onClick={async () => {
          setBusy(true);
          try {
            await api("ownerWholesaleSet", { ...target, percent: Number(percent) });
            haptic.ok();
            toast(`Оптовик со скидкой ${percent}%`);
            setOpen(false);
            onDone?.();
          } catch (e) {
            haptic.error();
            toast(e instanceof ApiError && e.code === "bad" ? "Сотруднику роль оптовика не даётся" : errText(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        Сохранить −{percent || 0}%
      </button>
      <button type="button" onClick={() => setOpen(false)}>
        Отмена
      </button>
    </div>
  );
}

type AdminWholesaler = { userId: number; name: string; percent: number; orders: number; sum: number; since: string };

export function Wholesale({ toast }: { toast: (t: string) => void }) {
  const { data, error, reload } = useList<{ wholesalers: AdminWholesaler[] }>("ownerWholesalers");
  const [num, setNum] = useState("");
  const [removing, setRemoving] = useState<number | null>(null);
  async function remove(userId: number) {
    try {
      await api("ownerWholesaleRemove", { userId });
      haptic.ok();
      toast("Роль оптовика снята");
      setRemoving(null);
      await reload();
    } catch (e) {
      haptic.error();
      toast(errText(e));
    }
  }
  return (
    <>
      <p className={s.hint}>
        Оптовик: своя постоянная скидка, без акций и промокодов, партнёрам с его заказов не начисляется.
      </p>
      <div className={s.editBox}>
        <Field label="Назначить по № заказа клиента">
          <input
            className={s.search}
            value={num}
            onChange={(e) => setNum(e.target.value.replace(/\D/g, "").slice(0, 9))}
            inputMode="numeric"
            placeholder="№ заказа"
          />
        </Field>
        {Number(num) > 0 && (
          <WholesaleAssign key={num} target={{ orderNumber: Number(num) }} toast={toast} onDone={reload} />
        )}
      </div>
      <Status error={error} loading={!data} />
      {data?.wholesalers.length === 0 && <p className={s.empty}>Оптовиков пока нет</p>}
      <ul className={s.list}>
        {data?.wholesalers.map((w) => (
          <li key={w.userId} className={s.row} data-wholesaler={w.userId}>
            <div className={s.rowHead}>
              <b className={s.ellipsis}>{w.name}</b>
              <span className={s.amount}>−{w.percent}%</span>
            </div>
            <p className={s.rowSub}>
              Заказов: {w.orders} на {money(w.sum)} · с {day(w.since)}
            </p>
            {removing === w.userId ? (
              <div className={s.decide}>
                <button type="button" data-approve onClick={() => remove(w.userId)}>
                  Да, снять роль
                </button>
                <button type="button" onClick={() => setRemoving(null)}>
                  Нет
                </button>
              </div>
            ) : (
              <button type="button" className={s.link} onClick={() => setRemoving(w.userId)}>
                Снять роль
              </button>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

function Status({ error, loading }: { error: string | null; loading: boolean }) {
  if (error) return <p className={s.hint}>{error}</p>;
  return loading ? <p className={s.hint}>Загрузка…</p> : null;
}

const TITLES: Record<OwnerScreen, string> = {
  partners: "Партнёры",
  managers: "Менеджеры",
  payouts: "Выплаты",
  promos: "Промокоды",
  client: "Заказ для клиента",
  promotions: "Акции",
  wholesale: "Оптовики",
};

export function OwnerScreenView({
  screen,
  onBack,
  toast,
}: {
  screen: OwnerScreen;
  onBack: () => void;
  toast: (t: string) => void;
}) {
  return (
    <section className={s.screen} data-owner-screen={screen}>
      <div className={s.screenHead}>
        <button type="button" className={s.link} onClick={onBack}>
          ← Назад
        </button>
        <h2 className={s.h3}>{TITLES[screen]}</h2>
      </div>
      {screen === "partners" && <Partners toast={toast} />}
      {screen === "managers" && <Managers toast={toast} />}
      {screen === "payouts" && <PayoutsScreen toast={toast} />}
      {screen === "promos" && <Promos toast={toast} />}
      {screen === "client" && <ClientOrders toast={toast} />}
      {screen === "promotions" && <Promotions toast={toast} />}
      {screen === "wholesale" && <Wholesale toast={toast} />}
    </section>
  );
}
