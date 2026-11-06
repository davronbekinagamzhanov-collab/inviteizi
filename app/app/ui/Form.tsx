"use client";
/** Анкета — один экран: превью сверху, поля по тадбиру, тадбиры (1–3), ошибки под полем */
import { useMemo } from "react";
import type { EventKind, InvitationEvent, Occasion, Relation } from "@/lib/types";
import type { Design } from "@/templates/registry";
import {
  ADDRESS_MAX, addableKinds, CAUSES, cleanText, fieldsFor, HOSTS_MAX, MAIN_EVENT, MAX_EVENTS, NAME_MAX, PERSON_MAX, RELATIONS, VENUE_MAX,
  type FieldError, type FormInput,
} from "@/lib/order-rules";
import { previewData, type PreviewExtras } from "@/lib/preview-data";
import { VENUES } from "@/bot/venues";
import { Field, Section, useT } from "./shared";
import { PreviewCard } from "./Preview";
import { TextChoice } from "./TextChoice";
import { haptic } from "./telegram";
import s from "../app.module.css";

/** Вместо пустого «--:--» — обычное время тадбира (клиент поменяет одним касанием) */
const DEFAULT_TIME: Record<EventKind, string> = {
  nikohBazm: "18:00",
  nahorgi: "06:00",
  sunnatBazm: "18:00",
  yubileyBazm: "18:00",
  kelinSalom: "09:00",
  nikohMarosim: "14:00",
};

export function emptyForm(occasion: Occasion): FormInput {
  const kind = MAIN_EVENT[occasion];
  return { occasion, relation: RELATIONS[occasion][0], events: [{ kind, time: DEFAULT_TIME[kind] }] } as FormInput;
}

type Props = {
  design: Design;
  form: FormInput;
  extras: PreviewExtras;
  today: string;
  errors: FieldError[];
  onChange: (f: FormInput) => void;
  /** Превью на весь экран (состояние у MiniApp: native-кнопки и «назад» его закрывают) */
  big: boolean;
  onBig: (open: boolean) => void;
  /** п.16: текст приглашения прямо в анкете (те же поля, что у итога) */
  onText: (p: { textId?: string; customText?: string }) => void;
};

export function Form({ design, form, extras, today, errors, onChange, big, onBig, onText }: Props) {
  const T = useT();
  const occ = design.occasion;
  const f = fieldsFor(occ);
  const events = form.events?.length ? form.events : [{ kind: MAIN_EVENT[occ], time: DEFAULT_TIME[MAIN_EVENT[occ]] }];
  const data = useMemo(() => previewData(design.sample, form, extras), [design.sample, form, extras]);
  const has = (k: FieldError) => errors.includes(k);

  /** Текст ошибки поля по его значению: пусто / нет букв / длинно */
  const textErr = (key: FieldError, value: unknown, max: number) => {
    if (!has(key)) return null;
    const r = cleanText(value, max);
    if ("value" in r) return null;
    return T.form.errors[r.problem];
  };
  const set = (patch: Partial<FormInput>) => onChange({ ...form, ...patch });
  const setEvent = (i: number, patch: Partial<InvitationEvent>) => {
    const list = events.map((e, j) => (j === i ? { ...e, ...patch } : e));
    onChange({ ...form, events: list });
  };
  const input = (key: FieldError, extra = "") => `${s.input} ${has(key) ? s.inputErr : ""} ${extra}`;
  const relations = RELATIONS[occ];
  const relLabel = (r: Relation) => (occ === "nikoh" ? T.form.relationsNikoh[r] : T.form.relations[r]) ?? r;
  const canAdd = addableKinds(occ, form.cause, events.map((e) => e.kind)).filter(() => events.length < MAX_EVENTS);

  return (
    <div className={s.screen}>
      <h1 className={s.title}>{T.form.title}</h1>
      <p className={s.lead}>{T.form.lead}</p>
      <PreviewCard templateId={design.id} data={data} big={big} onBig={onBig} />
      {errors.length > 0 && <p className={s.formErr}>{T.form.errors.fix}</p>}

      <Section>
        {f.couple ? (
          <div className={s.row2} style={{ gridTemplateColumns: "1fr 1fr" }}>
            <Field label={T.form.groom} error={textErr("groom", form.groom, NAME_MAX)}>
              <input className={input("groom")} value={form.groom ?? ""} placeholder={T.form.groomPh} maxLength={NAME_MAX} autoComplete="off" enterKeyHint="next" onChange={(e) => set({ groom: e.target.value })} name="groom" />
            </Field>
            <Field label={T.form.bride} error={textErr("bride", form.bride, NAME_MAX)}>
              <input className={input("bride")} value={form.bride ?? ""} placeholder={T.form.bridePh} maxLength={NAME_MAX} autoComplete="off" enterKeyHint="next" onChange={(e) => set({ bride: e.target.value })} name="bride" />
            </Field>
          </div>
        ) : (
          <Field label={T.form.person[occ as Exclude<Occasion, "nikoh">]} error={textErr("person", form.person, PERSON_MAX)}>
            <input className={input("person")} value={form.person ?? ""} placeholder={T.form.personPh[occ as Exclude<Occasion, "nikoh">]} maxLength={PERSON_MAX} autoComplete="off" onChange={(e) => set({ person: e.target.value })} name="person" />
          </Field>
        )}
        {f.age && (
          <Field label={T.form.age} error={has("age") ? T.form.errors.age : null}>
            <input className={input("age")} value={form.age ?? ""} inputMode="numeric" pattern="[0-9]*" placeholder={T.form.agePh} maxLength={3} onChange={(e) => set({ age: e.target.value.replace(/\D/g, "") as unknown as number })} name="age" />
          </Field>
        )}
        <div className={s.field}>
          <span className={s.label}>{occ === "nikoh" ? T.form.relationNikoh : T.form.relation}</span>
          <div className={s.seg} role="radiogroup">
            {relations.map((r) => (
              <button key={r} type="button" role="radio" aria-checked={(form.relation ?? relations[0]) === r} className={s.segBtn} onClick={() => { haptic.select(); set({ relation: r }); }}>
                {relLabel(r)}
              </button>
            ))}
          </div>
        </div>
        {f.cause && (
          <div className={s.field}>
            <span className={s.label}>{T.form.cause}</span>
            <div className={s.seg} role="radiogroup">
              {CAUSES.map((c) => (
                <button key={c} type="button" role="radio" aria-checked={form.cause === c} className={s.segBtn} onClick={() => { haptic.select(); set({ cause: c, events: events.map((e) => (e.kind === "nikohBazm" || e.kind === "sunnatBazm" ? { ...e, kind: c === "sunnat" ? "sunnatBazm" : "nikohBazm" } : e)) }); }}>
                  {T.form.causes[c]}
                </button>
              ))}
            </div>
            {has("cause") && <span className={s.err}>{T.form.errors.cause}</span>}
          </div>
        )}
        <Field label={T.form.hosts} error={textErr("hosts", form.hosts, HOSTS_MAX)}>
          <input className={input("hosts")} value={form.hosts ?? ""} placeholder={T.form.hostsPh} maxLength={HOSTS_MAX} autoComplete="off" onChange={(e) => set({ hosts: e.target.value })} name="hosts" />
        </Field>
        {f.couple && (
          <Field label={T.form.sideBride} error={textErr("sideBride", form.sides?.bride, HOSTS_MAX)}>
            <input className={input("sideBride")} value={form.sides?.bride ?? ""} placeholder={T.form.sideBridePh} maxLength={HOSTS_MAX} autoComplete="off" onChange={(e) => set({ sides: { bride: e.target.value } })} name="sideBride" />
          </Field>
        )}
      </Section>

      <TextChoice data={data} textId={extras.textId} customText={extras.customText} onChange={onText} />

      {events.map((e, i) => {
        const kind = (i === 0 ? MAIN_EVENT[occ] : e.kind) as EventKind;
        const k = (name: string) => `ev${i}.${name}` as FieldError;
        return (
          <Section
            key={`${kind}-${i}`}
            title={T.kinds[kind]}
            extra={i > 0 ? <button type="button" className={s.linkBtn} onClick={() => onChange({ ...form, events: events.filter((_, j) => j !== i) })}>{T.form.removeEvent}</button> : undefined}
          >
            <div className={s.row2}>
              <Field label={T.form.date} error={has(k("past")) ? T.form.errors.past : has(k("date")) ? T.form.errors.date : null}>
                <input type="date" className={input(k("date"), has(k("past")) ? s.inputErr : "")} value={e.date ?? ""} min={today} max="2030-12-31" onChange={(ev) => setEvent(i, { date: ev.target.value })} name={`date${i}`} />
              </Field>
              <Field label={T.form.time} error={has(k("time")) ? T.form.errors.time : null}>
                <input type="time" className={input(k("time"))} value={e.time ?? ""} step={300} onChange={(ev) => setEvent(i, { time: ev.target.value })} name={`time${i}`} />
              </Field>
            </div>
            <Field label={T.form.venue} error={textErr(k("venueName"), e.venueName, VENUE_MAX)}>
              <input className={input(k("venueName"))} value={e.venueName ?? ""} placeholder={T.form.venuePh} maxLength={VENUE_MAX} autoComplete="off" onChange={(ev) => setEvent(i, { venueName: ev.target.value })} name={`venue${i}`} />
            </Field>
            <div className={s.venues} aria-label={T.form.venue}>
              {VENUES.map((v) => (
                <button key={v.id} type="button" className={s.segBtn} aria-pressed={e.venueName === v.name} onClick={() => { haptic.select(); setEvent(i, { venueName: v.name, address: `Сайрам, ${v.address}`, mapUrl: v.mapUrl }); }}>
                  {v.name}
                </button>
              ))}
            </div>
            <div style={{ height: 14 }} />
            <Field label={T.form.address} error={textErr(k("address"), e.address, ADDRESS_MAX)}>
              <input className={input(k("address"))} value={e.address ?? ""} placeholder={T.form.addressPh} maxLength={ADDRESS_MAX} autoComplete="off" onChange={(ev) => setEvent(i, { address: ev.target.value })} name={`address${i}`} />
            </Field>
            <Field label={T.form.map} error={has(k("mapUrl")) ? T.form.errors.map : null} help={T.form.mapHelp}>
              <input className={input(k("mapUrl"))} value={e.mapUrl ?? ""} placeholder={T.form.mapPh} inputMode="url" autoComplete="off" onChange={(ev) => setEvent(i, { mapUrl: ev.target.value.trim() || undefined })} name={`map${i}`} />
            </Field>
          </Section>
        );
      })}

      {canAdd.length > 0 && (
        <div className={s.seg} style={{ marginBottom: 14 }}>
          {canAdd.map((kind) => (
            <button key={kind} type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSmall}`} onClick={() => { haptic.tap(); onChange({ ...form, events: [...events, { kind, time: DEFAULT_TIME[kind], date: events[0]?.date }] }); }}>
              {T.form.addEvent(T.kinds[kind])}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
