/**
 * Живое превью в приложении: что клиент уже ввёл — поверх примера дизайна.
 * Пустое поле показывает пример (имена, дата), поэтому превью никогда не «ломается» на пустой форме.
 */
import type { InvitationData, InvitationEvent } from "./types";
import type { FormInput } from "./order-rules";
import { MAIN_EVENT, isDate, isTime } from "./order-rules";

const filled = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const pick = (v: unknown, fallback: string | undefined) => (filled(v) ? v.trim().slice(0, 120) : fallback);

export type PreviewExtras = { photos?: string[]; textId?: string; customText?: string; rsvp?: boolean };

export function previewData(sample: InvitationData, form: FormInput | undefined, extras: PreviewExtras = {}): InvitationData {
  const f = form ?? {};
  const occasion = sample.occasion;
  const sampleMain = sample.events[0];
  const events: InvitationEvent[] = (f.events?.length ? f.events : [{}]).slice(0, 3).map((e, i) => {
    const base = sample.events.find((s) => s.kind === e.kind) ?? (i === 0 ? sampleMain : sampleMain);
    return {
      kind: i === 0 ? MAIN_EVENT[occasion] : (e.kind ?? base.kind),
      date: isDate(e.date) ? e.date : base.date,
      time: isTime(e.time) ? e.time : base.time,
      venueName: pick(e.venueName, base.venueName)!,
      address: pick(e.address, base.address)!,
      ...(e.mapUrl ? { mapUrl: e.mapUrl } : base.mapUrl ? { mapUrl: base.mapUrl } : {}),
    };
  });
  const age = Number(f.age);
  return {
    ...sample,
    groom: pick(f.groom, sample.groom),
    bride: pick(f.bride, sample.bride),
    person: pick(f.person, sample.person),
    relation: f.relation ?? sample.relation,
    cause: f.cause ?? sample.cause,
    age: Number.isInteger(age) && age > 0 && age <= 120 ? age : sample.age,
    hosts: pick(f.hosts, sample.hosts)!,
    sides: filled(f.sides?.bride) ? { groom: pick(f.hosts, sample.hosts), bride: f.sides!.bride!.trim() } : sample.sides,
    events,
    photos: extras.photos?.length ? extras.photos : sample.photos,
    textId: extras.textId ?? sample.textId,
    customText: filled(extras.customText) ? extras.customText : undefined,
    rsvp: extras.rsvp ?? sample.rsvp,
    // Превью без звука: музыку клиент слушает на шаге «Мусиқа»
    noMusic: true,
    musicUrl: undefined,
  };
}
