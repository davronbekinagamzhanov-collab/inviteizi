/** Анкета: имена, кем приходится, повод, хозяева, стороны */
import type { Ctx, Result, Step } from "./types";
import type { Relation } from "@/lib/types";
import { after, backRow, curEvent, data, ib, inline, MAIN_EVENT, send } from "./util";

/** Текст ответа: обрезаем пробелы, проверяем длину. Не текст — null (общая подсказка) */
function textAnswer(c: Ctx, max: number): string | { hint: string } | null {
  if (c.u.kind !== "text") return null;
  const v = c.u.text.trim().replace(/\s+/g, " ");
  if (!v) return null;
  if (v.length > max) return { hint: c.tx.tooLong(max) };
  return v;
}

/** Шаг «напишите текст» */
function textStep(question: (c: Ctx) => string, max: number, save: (c: Ctx, v: string) => Result): Step {
  return {
    async ask(c) {
      await send(c, question(c), inline([backRow(c)]));
    },
    async onMessage(c) {
      const v = textAnswer(c, max);
      if (v === null || typeof v === "object") return v;
      return save(c, v);
    },
  };
}

const NAME_MAX = 40;

/** После хозяев/сторон — первый тадбир (при правке — назад к сводке) */
function toFirstEvent(c: Ctx): Result {
  if (c.s.ret) return { to: "review" };
  c.s.ev = 0;
  const e = curEvent(c);
  e.kind ??= MAIN_EVENT[c.s.occasion ?? "nikoh"];
  return { to: "evDate" };
}

export const groom = textStep((c) => c.tx.form.groom, NAME_MAX, (c, v) => {
  data(c).groom = v;
  return { to: "bride" };
});

export const bride = textStep((c) => c.tx.form.bride, NAME_MAX, (c, v) => {
  data(c).bride = v;
  return { to: after(c, "relation") };
});

export const person = textStep(
  (c) => (c.s.occasion === "sunnat" ? c.tx.form.personSunnat : c.tx.form.personNahorgi),
  NAME_MAX * 2,
  (c, v) => {
    data(c).person = v;
    return { to: after(c, "relation") };
  },
);

const RELATIONS: Record<"nikoh" | "nahorgi" | "sunnat", Relation[]> = {
  nikoh: ["farzand", "nabira", "ozimiz"],
  nahorgi: ["ogil", "qiz", "nabira", "uka", "ozimiz"],
  sunnat: ["ogil", "nabira", "uka", "farzand"],
};

const relationsFor = (c: Ctx) => RELATIONS[(c.s.occasion ?? "nikoh") as "nikoh"] ?? RELATIONS.nikoh;

export const relation: Step = {
  async ask(c) {
    const nikoh = c.s.occasion === "nikoh";
    const label = (r: Relation) => (nikoh ? c.tx.form.relationsNikoh[r] : c.tx.form.relations[r]) ?? r;
    const rows = relationsFor(c).map((r) => [ib(c, label(r), r)]);
    const q = nikoh ? c.tx.form.relationNikoh : c.tx.form.relationPerson(data(c).person ?? "");
    await send(c, q, inline([...rows, backRow(c)]));
  },
  async onButton(c, v) {
    if (!relationsFor(c).includes(v as Relation)) return null;
    data(c).relation = v as Relation;
    return { to: after(c, c.s.occasion === "nahorgi" ? "cause" : "hosts") };
  },
};

export const cause: Step = {
  async ask(c) {
    const rows = (["nikoh", "sunnat"] as const).map((k) => [ib(c, c.tx.form.causes[k], k)]);
    await send(c, c.tx.form.cause, inline([...rows, backRow(c)]));
  },
  async onButton(c, v) {
    if (v !== "nikoh" && v !== "sunnat") return null;
    data(c).cause = v;
    return { to: after(c, "hosts") };
  },
};

export const hosts = textStep((c) => c.tx.form.hosts, 60, (c, v) => {
  const d = data(c);
  d.hosts = v;
  if (d.sides) d.sides.groom = v;
  if (c.s.occasion === "nikoh") return { to: after(c, "sideAsk") };
  return toFirstEvent(c);
});

export const sideAsk: Step = {
  async ask(c) {
    await send(c, c.tx.form.sideAsk, inline([[ib(c, c.tx.form.sideYes, "yes"), ib(c, c.tx.form.sideNo, "no")], backRow(c)]));
  },
  async onButton(c, v) {
    if (v === "yes") return { to: "sideBride" };
    if (v === "no") {
      delete data(c).sides;
      return toFirstEvent(c);
    }
    return null;
  },
};

export const sideBride = textStep((c) => c.tx.form.sideBride, 60, (c, v) => {
  const d = data(c);
  d.sides = { groom: d.hosts, bride: v };
  return toFirstEvent(c);
});
