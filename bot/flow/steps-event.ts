/** Тадбир: дата (календарь), время, место, адрес, локация; «ещё тадбир?» */
import { VENUES, venuePickerUrl } from "../venues";
import type { Ctx, Result, Step } from "./types";
import type { EventKind } from "@/lib/types";
import type { InlineButton } from "../tg";
import { addMonths, calendarMonth, kzTime, kzToday } from "../calendar";
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
  editOrSend,
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

/** Тадбир сегодня, а это время уже прошло (Asia/Almaty) */
const isPastTime = (c: Ctx, time: string) => curEvent(c).date === kzToday(c.deps.now()) && time < kzTime(c.deps.now());

/** После даты: время (или сразу место для добавленного наҳорги) */
function afterDate(c: Ctx): Result {
  const time = curEvent(c).time;
  if (c.s.ret) return time && isPastTime(c, time) ? { to: "evTime" } : { to: "review" };
  if (isAddedNahorgi(c)) {
    const chosen = time ?? ADDED_NAHORGI_TIME;
    if (isPastTime(c, chosen)) return { to: "evTime" };
    curEvent(c).time = chosen;
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
      await editOrSend(c, v.text, v.markup);
      return { stay: true };
    }
    if (value.startsWith("d:")) {
      const date = value.slice(2);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
      // кнопку могли подделать: проверяем, что такой день есть в календаре и он не дальше 12 месяцев
      const real = new Date(`${date}T00:00:00Z`);
      if (Number.isNaN(real.getTime()) || real.toISOString().slice(0, 10) !== date) return null;
      if (date.slice(0, 7) > addMonths(today.slice(0, 7), 12)) return null;
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
  if (isPastTime(c, time)) return { hint: c.tx.event.pastTime };
  curEvent(c).time = time;
  return { to: after(c, "evVenue") };
}

export const evTime: Step = {
  async ask(c) {
    const times = TIMES[curEvent(c).kind ?? "nikohBazm"].filter((x) => !isPastTime(c, x));
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
  // Невидимые символы (смена направления текста и т. п.) в приглашение не попадают; место — хоть одна буква или цифра
  const v = c.u.text.replace(/[\p{Cc}\p{Cf}]/gu, " ").trim().replace(/\s+/g, " ");
  if (!v) return null;
  if (!/[\p{L}\p{N}]/u.test(v)) return { hint: c.tx.needLetters };
  if (v.length > max) return { hint: c.tx.tooLong(max) };
  return v;
}

export const evVenue: Step = {
  onButton: placeButton,
  async ask(c) {
    await send(c, c.tx.event.venue(kindLabel(c)), placeChoices(c));
  },
  async onMessage(c) {
    if(c.u.kind==="venue"||c.u.kind==="location"||(c.u.kind==="text"&&isMapLink(c.u.text)))return mapMessage(c);
    const v = textOf(c, 80);
    if (typeof v !== "string") return v;
    const e=curEvent(c);
    if(e.venueName&&e.venueName!==v){delete e.location;delete e.mapUrl;}
    e.venueName = v;
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
    const e=curEvent(c);
    if(c.s.venueNameInput!==undefined){
      if(e.venueName){delete e.location;delete e.mapUrl;}
      e.venueName=c.s.venueNameInput;e.address=v;delete c.s.venueNameInput;
      return e.location||e.mapUrl?afterEvent(c):{to:"evLoc"};
    }
    e.address = v;
    return { to: after(c, "evLoc") };
  },
};

/** Какие тадбиры можно добавить (без уже добавленных) */
function addable(c: Ctx): EventKind[] {
  const d = data(c);
  const have = new Set(d.events.filter(isCompleteEvent).map((e) => e.kind));
  const bazm: EventKind = d.cause === "sunnat" ? "sunnatBazm" : "nikohBazm";
  const options: EventKind[] =
    c.s.occasion === "nikoh" ? ["nahorgi", "kelinSalom"] : c.s.occasion === "nahorgi" ? [bazm] : ["nahorgi"];
  return options.filter((k) => !have.has(k));
}

/** После локации: ещё тадбир? (если есть место и что добавить) */
async function afterEvent(c: Ctx): Promise<Result> {
  if(!curEvent(c).date)return {to:"evDate"};
  if(!curEvent(c).time)return {to:"evTime"};
  if(!curEvent(c).venueName)return {to:"evVenueName"};
  if(!curEvent(c).address)return {to:"evAddress"};
  delete c.s.venueNameInput;
  if (c.s.ret) return { to: "review" };
  const count = data(c).events.filter(isCompleteEvent).length;
  if (count >= MAX_EVENTS) {
    await send(c, c.tx.event.maxReached);
    return { to: "text" };
  }
  return { to: addable(c).length ? "more" : "text" };
}

function placeChoices(c:Ctx){
  const t=c.tx.event;
  return inline([[ib(c,t.readyVenues,"places")],[ib(c,t.mapChoice,"map")],[ib(c,t.linkChoice,"link")],[ib(c,t.manualChoice,"manual")],[ib(c,t.skip,"skip")],backRow(c)]);
}
async function placeButton(c:Ctx,v:string):Promise<Result>{
  if(v==="places"){c.s.venuePage=0;return {to:"evPlaces"};}
  if(v==="map")return {to:"evMap"};
  if(v==="link")return {to:"evLink"};
  if(v==="manual")return {to:"evVenueName"};
  if(v==="skip")return afterEvent(c);
  return null;
}
export const evVenueName:Step={
  async ask(c){await send(c,c.tx.event.manualPrompt,inline([backRow(c)]));},
  async onMessage(c){
    const v=textOf(c,80);if(typeof v!=="string")return v;
    // Apply name and address together; Back must not leave a half-replaced existing event.
    c.s.venueNameInput=v;
    return {to:"evAddress"};
  },
};
function placesView(c:Ctx){
  const list=VENUES.slice((c.s.venuePage??0)*5,(c.s.venuePage??0)*5+5);
  return {text:list.map(p=>p.name+"\n"+p.address).join("\n\n")+"\n\n"+c.tx.event.venuesPrompt,
    markup:inline([...list.map(p=>[{text:`🗺 ${p.name}`,url:p.mapUrl},ib(c,`✅ ${p.name}`,"venue:"+p.id)]),[ib(c,"◀","previous"),ib(c,"▶","next")],backRow(c)])};
}
export const evPlaces:Step={
  async ask(c){const v=placesView(c);await send(c,v.text,v.markup);},
  async onButton(c,v){
    if(v==="next"||v==="previous"){
      c.s.venuePage=((c.s.venuePage??0)+1)%2;const page=placesView(c);
      await editOrSend(c,page.text,page.markup);return {stay:true};
    }
    const place=VENUES.find(p=>v==="venue:"+p.id);if(!place)return null;
    Object.assign(curEvent(c),{venueName:place.name,address:place.address,mapUrl:place.mapUrl});delete curEvent(c).location;
    return afterEvent(c);
  },
};
async function mapMessage(c:Ctx):Promise<Result>{
  const e=curEvent(c),u=c.u;
  if(u.kind==="location"||u.kind==="venue"){
    if(!Number.isFinite(u.lat)||!Number.isFinite(u.lng)||Math.abs(u.lat)>90||Math.abs(u.lng)>180)return {hint:c.tx.event.badLocation};
    if(u.kind==="venue"){
      if(!u.title.trim()||!u.address.trim())return {hint:c.tx.event.badLocation};
      if(u.title.length>80||u.address.length>150)return {hint:c.tx.tooLong(u.title.length>80?80:150)};
      e.venueName=u.title;e.address=u.address;
    }
    e.location={lat:u.lat,lng:u.lng};delete e.mapUrl;
    await send(c,c.tx.event.locationSaved,mainMenu(c.tx));return afterEvent(c);
  }
  if(u.kind==="text"){
    const v=u.text.trim();
    // Old reply-keyboard messages remain readable after upgrading to inline controls.
    if(v===c.tx.event.skip){await send(c,c.tx.ok,mainMenu(c.tx));return afterEvent(c);}
    if(isMapLink(v)){e.mapUrl=v;delete e.location;await send(c,c.tx.event.locationSaved,mainMenu(c.tx));return afterEvent(c);}
  }
  return {hint:c.tx.event.badLocation};
}
export const evLoc:Step={
  // Clear an old persistent request_location keyboard on Back; new prompts are inline only.
  replyKeyboard:true,
  async ask(c){await send(c,c.tx.event.location,placeChoices(c));},
  onButton:placeButton,onMessage:mapMessage,
};
export const evLink:Step={
  async ask(c){await send(c,c.tx.event.linkPrompt,inline([[ib(c,c.tx.event.skip,"skip")],backRow(c)]));},
  onButton:placeButton,onMessage:mapMessage,
};
export const evMap:Step={
  async ask(c){
    const url=venuePickerUrl(c.deps.env.venueMapPickerUrl,c.deps.env.publicBaseUrl);
    const rows:InlineButton[][]=[[{text:c.tx.event.openPlace,url:"https://2gis.kz/"}]];
    if(url)rows.push([{text:c.tx.event.mapChoice,url}]);
    rows.push([ib(c,c.tx.event.linkChoice,"link")],[ib(c,c.tx.event.skip,"skip")],backRow(c));
    await send(c,c.tx.event.mapPrompt,inline(rows));
  },
  onButton:placeButton,onMessage:mapMessage,
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
