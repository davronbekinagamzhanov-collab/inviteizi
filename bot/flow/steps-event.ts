/** Тадбир: дата (календарь), время, место, адрес, локация; «ещё тадбир?» */
import type { Ctx, Result, Step } from "./types";
import type { EventKind } from "@/lib/types";
import type { InlineButton } from "../tg";
import { addMonths, calendarMonth, kzToday } from "../calendar";
import { isMapLink, parseTime } from "../parse";
import {
  after,
  backRow,
  curEvent,
  data,
  eventLabel,
  fmtDate,
  ib,
  inline,
  isCompleteEvent,
  mainMenu,
  MAX_EVENTS,
  send,
} from "./util";

const TIMES: Record<EventKind, string[]> = {
  nikohBazm: ["11:00", "12:00", "17:00", "18:00", "19:00"],
  sunnatBazm: ["11:00", "12:00", "17:00", "18:00", "19:00"],
  yubileyBazm: ["11:00", "12:00", "17:00", "18:00", "19:00"],
  nikohMarosim: ["10:00", "11:00", "12:00", "14:00", "16:00"],
  nahorgi: ["05:00", "05:30", "06:00", "06:30", "07:00"],
  kelinSalom: ["08:00", "09:00", "10:00", "11:00"],
};

/** Добавленный наҳорги ош: время по умолчанию, не спрашиваем (можно поменять в сводке) */
const ADDED_NAHORGI_TIME = "06:00";

const kindLabel = (c: Ctx) => eventLabel(c.tx, curEvent(c).kind ?? "nikohBazm");
const isAddedNahorgi = (c: Ctx) => (c.s.ev ?? 0) > 0 && curEvent(c).kind === "nahorgi";

/** После даты: время (или сразу место для добавленного наҳорги) */
function afterDate(c: Ctx): Result {
  if (c.s.ret) return { to: "review" };
  if (isAddedNahorgi(c)) {
    curEvent(c).time ??= ADDED_NAHORGI_TIME;
    return { to: "evVenue" };
  }
  return { to: "evTime" };
}

function calendarView(c: Ctx) {
  const today = kzToday(c.deps.now());
  const month = c.s.calMonth ?? (curEvent(c).date ?? today).slice(0, 7);
  const m = calendarMonth(month < today.slice(0, 7) ? today.slice(0, 7) : month, today);
  c.s.calMonth = m.month;
  const [y, mm] = m.month.split("-").map(Number);
  const blank = "⠀";
  const rows: InlineButton[][] = [
    [
      m.canPrev ? ib(c, "◀", `m:${addMonths(m.month, -1)}`) : ib(c, blank, "x"),
      ib(c, c.tx.event.monthYear(mm - 1, y), "x"),
      m.canNext ? ib(c, "▶", `m:${addMonths(m.month, 1)}`) : ib(c, blank, "x"),
    ],
    c.tx.event.weekdays.map((w) => ib(c, w, "x")),
    ...m.weeks.map((w) => w.map((cell) => (cell === null ? ib(c, blank, "x") : cell.past ? ib(c, "·", "x") : ib(c, String(cell.day), `d:${cell.date}`)))),
    backRow(c),
  ];
  return { text: c.tx.event.date(kindLabel(c)), markup: inline(rows), today, m };
}

export const evDate: Step = {
  async ask(c) {
    const v = calendarView(c);
    await send(c, v.text, v.markup);
  },
  async onButton(c, value) {
    const today = kzToday(c.deps.now());
    if (value.startsWith("m:")) {
      const month = value.slice(2);
      const cur = today.slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(month) || month < cur || month > addMonths(cur, 12)) return { stay: true };
      c.s.calMonth = month;
      const v = calendarView(c);
      await c.deps.tg.editMessageText(c.chatId, c.u.messageId, v.text, { markup: v.markup });
      return { stay: true };
    }
    if (value.startsWith("d:")) {
      const date = value.slice(2);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
      if (date < today) return { hint: c.tx.event.pastDate };
      curEvent(c).date = date;
      delete c.s.calMonth;
      return afterDate(c);
    }
    return null;
  },
};

export const evSameDay: Step = {
  async ask(c) {
    const first = data(c).events[0];
    await send(
      c,
      c.tx.event.sameDay(kindLabel(c), fmtDate(first?.date ?? "")),
      inline([[ib(c, c.tx.event.sameDayYes, "yes"), ib(c, c.tx.event.sameDayNo, "no")], backRow(c)]),
    );
  },
  async onButton(c, v) {
    if (v === "yes") {
      curEvent(c).date = data(c).events[0]?.date;
      return afterDate(c);
    }
    if (v === "no") return { to: "evDate" };
    return null;
  },
};

function acceptTime(c: Ctx, time: string): Result {
  curEvent(c).time = time;
  return { to: after(c, "evVenue") };
}

export const evTime: Step = {
  async ask(c) {
    const times = TIMES[curEvent(c).kind ?? "nikohBazm"];
    const rows: InlineButton[][] = [];
    for (let i = 0; i < times.length; i += 3) rows.push(times.slice(i, i + 3).map((x) => ib(c, x, `t:${x}`)));
    rows.push([ib(c, c.tx.event.timeOther, "other")], backRow(c));
    await send(c, c.tx.event.time(kindLabel(c)), inline(rows));
  },
  async onButton(c, v) {
    if (v === "other") return { to: "evTimeCustom" };
    const time = v.startsWith("t:") ? parseTime(v.slice(2)) : null;
    return time ? acceptTime(c, time) : null;
  },
  async onMessage(c) {
    // Время можно и написать, не нажимая «Бошқа вақт»
    if (c.u.kind !== "text") return null;
    const time = parseTime(c.u.text);
    return time ? acceptTime(c, time) : { hint: c.tx.event.badTime };
  },
};

export const evTimeCustom: Step = {
  async ask(c) {
    await send(c, c.tx.event.timeCustom, inline([backRow(c)]));
  },
  async onMessage(c) {
    if (c.u.kind !== "text") return null;
    const time = parseTime(c.u.text);
    return time ? acceptTime(c, time) : { hint: c.tx.event.badTime };
  },
};

function textOf(c: Ctx, max: number): string | Result {
  if (c.u.kind !== "text") return null;
  const v = c.u.text.trim().replace(/\s+/g, " ");
  if (!v) return null;
  if (v.length > max) return { hint: c.tx.tooLong(max) };
  return v;
}

export const evVenue: Step = {
  async ask(c) {
    await send(c, c.tx.event.venue(kindLabel(c)), inline([backRow(c)]));
  },
  async onMessage(c) {
    const v = textOf(c, 80);
    if (typeof v !== "string") return v;
    curEvent(c).venueName = v;
    return { to: after(c, "evAddress") };
  },
};

export const evAddress: Step = {
  async ask(c) {
    await send(c, c.tx.event.address, inline([backRow(c)]));
  },
  async onMessage(c) {
    const v = textOf(c, 150);
    if (typeof v !== "string") return v;
    curEvent(c).address = v;
    return { to: after(c, "evLoc") };
  },
};

/** Какие тадбиры можно добавить (без уже добавленных) */
function addable(c: Ctx): EventKind[] {
  const d = data(c);
  const have = new Set(d.events.map((e) => e.kind));
  const bazm: EventKind = d.cause === "sunnat" ? "sunnatBazm" : "nikohBazm";
  const options: EventKind[] =
    c.s.occasion === "nikoh" ? ["nahorgi", "kelinSalom"] : c.s.occasion === "nahorgi" ? [bazm] : ["nahorgi"];
  return options.filter((k) => !have.has(k));
}

/** После локации: ещё тадбир? (если есть место и что добавить) */
async function afterEvent(c: Ctx): Promise<Result> {
  if (c.s.ret) return { to: "review" };
  const count = data(c).events.filter(isCompleteEvent).length;
  if (count >= MAX_EVENTS) {
    await send(c, c.tx.event.maxReached);
    return { to: "text" };
  }
  return { to: addable(c).length ? "more" : "text" };
}

export const evLoc: Step = {
  replyKeyboard: true,
  async ask(c) {
    await send(c, c.tx.event.location, {
      reply: [[{ text: c.tx.event.sendLocation, location: true }], [{ text: c.tx.event.skip }], [{ text: c.tx.back }]],
    });
  },
  async onMessage(c) {
    const e = curEvent(c);
    if (c.u.kind === "location") {
      e.location = { lat: c.u.lat, lng: c.u.lng };
      delete e.mapUrl;
      await send(c, c.tx.event.locationSaved, mainMenu(c.tx));
      return afterEvent(c);
    }
    if (c.u.kind === "text") {
      const v = c.u.text.trim();
      if (v === c.tx.event.skip) {
        await send(c, c.tx.ok, mainMenu(c.tx));
        return afterEvent(c);
      }
      if (isMapLink(v)) {
        e.mapUrl = v;
        delete e.location;
        await send(c, c.tx.event.locationSaved, mainMenu(c.tx));
        return afterEvent(c);
      }
    }
    return { hint: c.tx.event.badLocation };
  },
};

const ADD_LABEL = (c: Ctx, k: EventKind) =>
  k === "nahorgi" ? c.tx.event.addNahorgi : k === "kelinSalom" ? c.tx.event.addKelinSalom : c.tx.event.addBazm;

export const more: Step = {
  async ask(c) {
    const d = data(c);
    // Брошенный на полпути тадбир (вернулись «Назад») — убираем
    d.events = d.events.filter(isCompleteEvent);
    const list = d.events
      .map((e, i) => c.tx.event.line(i + 1, eventLabel(c.tx, e.kind!), fmtDate(e.date!), e.time!))
      .join("\n");
    const rows = addable(c).map((k) => [ib(c, ADD_LABEL(c, k), `add:${k}`)]);
    await send(c, c.tx.event.more(list), inline([...rows, [ib(c, c.tx.event.noMore, "done")], backRow(c)]));
  },
  async onButton(c, v) {
    if (v === "done") return { to: "text" };
    if (v.startsWith("add:")) {
      const kind = v.slice(4) as EventKind;
      if (!addable(c).includes(kind)) return null;
      const d = data(c);
      d.events = d.events.filter(isCompleteEvent);
      if (d.events.length >= MAX_EVENTS) return { hint: c.tx.event.maxReached };
      d.events.push({ kind });
      c.s.ev = d.events.length - 1;
      return { to: kind === "kelinSalom" ? "evDate" : "evSameDay" };
    }
    return null;
  },
};
