/** Текст приглашения, музыка, сводка и правка тадбира из сводки */
import type { Ctx, Result, Step, StepId } from "./types";
import { getDesign } from "@/templates/registry";
import type { InlineButton } from "../tg";
import { tPlain as t } from "@/texts/uz-cyrl";
import { backRow, data, demoUrl, designLine, editOrSend, eventLabel, finalData, fmtDate, ib, inline, MAX_CUSTOM_TEXT, MAX_MUSIC_BYTES, send } from "./util";
import { cleanOwnText, graphemes } from "@/lib/order-rules";
import type { ExtraLang } from "@/lib/types";
import { catalogList, pageOf } from "./steps-order";
import { confirmDraft } from "./orders";
import { photoStepFor } from "./steps-photo";
import { recordBotError, toEntry } from "../errors";
import { MusicTooBigError } from "../own-music";

/** Варианты текста показываем по 3, «🔄 Бошқа вариантлар» листает дальше по кругу */
const PAGE = 3;
const options = (c: Ctx) => t.inviteOptions(finalData(c.s));

function textScreen(c: Ctx) {
  const all = options(c);
  const pages = Math.ceil(all.length / PAGE);
  const page = ((c.s.textPage ?? 0) % pages + pages) % pages;
  const shown = all.slice(page * PAGE, page * PAGE + PAGE);
  const body = shown.map((o, i) => c.tx.text.option(page * PAGE + i + 1, o.greeting, o.body)).join("\n\n");
  const picks = shown.map((_, i) => ib(c, c.tx.text.pick(page * PAGE + i + 1), `p:${page * PAGE + i}`));
  const rows = [picks, ...(pages > 1 ? [[ib(c, c.tx.text.more, "more")]] : []), [ib(c, c.tx.text.own, "own")], backRow(c)];
  return { text: c.tx.text.ask(body), markup: inline(rows) };
}

export const text: Step = {
  async ask(c) {
    const s = textScreen(c);
    await send(c, s.text, s.markup);
  },
  async onButton(c, v) {
    if (v === "own") return { to: "textOwn" };
    if (v === "more") {
      c.s.textPage = (c.s.textPage ?? 0) + 1;
      const s = textScreen(c);
      // то же сообщение, новые варианты — чат не засоряется
      await editOrSend(c, s.text, s.markup);
      return { stay: true };
    }
    const o = v.startsWith("p:") ? options(c)[Number(v.slice(2))] : undefined;
    if (!o) return null;
    const d = data(c);
    d.textId = o.id;
    delete d.customText;
    delete c.s.textPage;
    return { to: c.s.ret ?? "music" };
  },
};

export const textOwn: Step = {
  async ask(c) {
    await send(c, c.tx.text.ownAsk, inline([backRow(c)]));
  },
  async onMessage(c) {
    if (c.u.kind !== "text") return null;
    // Невидимые символы убираем, но перевод строки и склейку эмодзи (U+200D) оставляем
    const v = c.u.text.replace(/(?!\n|‍)[\p{Cc}\p{Cf}]/gu, "").trim();
    if (!v) return null;
    // Считаем видимые знаки: эмодзи-семья 👨‍👩‍👧‍👦 — один знак, а не семь
    const n = [...new Intl.Segmenter().segment(v)].length;
    if (n > MAX_CUSTOM_TEXT) return { hint: c.tx.text.tooLong(n) };
    const d = data(c);
    d.customText = v;
    delete d.textId;
    return { to: c.s.ret ?? "music" };
  },
};

export const music: Step = {
  async ask(c) {
    const list = await c.deps.repo.listMusic(c.s.occasion);
    const rows: InlineButton[][] = [];
    if (list.length) rows.push([ib(c, c.tx.music.fromList, "list")]);
    rows.push([ib(c, c.tx.music.own, "own")], [ib(c, c.tx.music.none, "none")], backRow(c));
    await send(c, c.tx.music.ask, inline(rows));
  },
  async onButton(c, v) {
    if (v === "list") return { to: "musicList" };
    if (v === "own") return { to: "musicOwn" };
    if (v === "none") {
      c.s.music = { kind: "none" };
      return { to: afterMusic(c) };
    }
    return null;
  },
};

/** Вопрос про ответы гостей задаём один раз; в правках из сводки — сразу назад */
const afterMusic = (c: Ctx): StepId => (c.s.ret || c.s.orderId || data(c).rsvp !== undefined ? "review" : "rsvp");

export const rsvp: Step = {
  async ask(c) {
    await send(c, c.tx.rsvp.ask, inline([[ib(c, c.tx.rsvp.yes, "yes"), ib(c, c.tx.rsvp.no, "no")], [ib(c, c.tx.rsvp.howButton, "how")], backRow(c)]));
  },
  async onButton(c, v) {
    if (v === "how") {
      await send(c, c.tx.rsvp.how);
      return { stay: true };
    }
    if (v !== "yes" && v !== "no") return null;
    data(c).rsvp = v === "yes";
    if (v === "yes") await send(c, c.tx.rsvp.how);
    return { to: "review" };
  },
};

// ── v2, часть 9: языки приглашения (узбекский есть всегда) ──

/** «…/demo/muhr#dt=…» → «…/demo/muhr?lang=ru#dt=…» */
const withLang = (url: string, l: ExtraLang) => {
  const [base, hash] = url.split("#");
  return `${base}?lang=${l}${hash ? `#${hash}` : ""}`;
};

const SHORT = { uz: "ЎЗ", ru: "РУ", kk: "ҚЗ" } as const;

const allowedLangs = (c: Ctx): ExtraLang[] => (c.deps.env.kazakhEnabled ? ["ru", "kk"] : ["ru"]);

function langsScreen(c: Ctx) {
  const d = data(c);
  const on = d.langs ?? [];
  const L = c.tx.langs;
  const rows: InlineButton[][] = allowedLangs(c).map((l) => [
    ib(c, on.includes(l) ? L.on(L.names[l]) : L.off(L.names[l]), `t:${l}`),
    ...(c.s.templateId ? [{ text: L.example(L.names[l]), url: withLang(demoUrl(c, c.s.templateId), l) }] : []),
  ]);
  // Свой текст: перевод клиент пишет сам
  if (d.customText) for (const l of on) rows.push([ib(c, L.ownButton(L.names[l]), `own:${l}`)]);
  // Главный язык: на нём страница открывается, если телефон гостя не на другом выбранном языке
  const main = d.mainLang && on.includes(d.mainLang) ? d.mainLang : "uz";
  if (on.length) rows.push((["uz", ...on] as const).map((l) => ib(c, `${l === main ? "✓ " : ""}${SHORT[l]}`, `m:${l}`)));
  rows.push([ib(c, L.done, "done")]);
  const text = L.ask(allowedLangs(c).includes("kk")) + (on.length ? `\n\n${L.mainAsk}\n${L.main(L.names[main])}\n${L.mainHint}` : "");
  return { text, markup: inline(rows) };
}

export const langs: Step = {
  async ask(c) {
    const { text, markup } = langsScreen(c);
    await send(c, text, markup);
  },
  async onButton(c, v) {
    const d = data(c);
    if (v === "done") return { to: "review" };
    const [kind, l] = v.split(":") as [string, ExtraLang];
    if (kind === "m" && ((l as string) === "uz" || d.langs?.includes(l))) {
      d.mainLang = (l as string) === "uz" ? undefined : l;
      const { text, markup } = langsScreen(c);
      await editOrSend(c, text, markup);
      return { stay: true };
    }
    if (!allowedLangs(c).includes(l)) return null;
    if (kind === "t") {
      const on = d.langs ?? [];
      d.langs = on.includes(l) ? on.filter((x) => x !== l) : allowedLangs(c).filter((x) => x === l || on.includes(x));
      if (on.includes(l) && d.mainLang === l) delete d.mainLang;
      if (on.includes(l) && d.customTexts?.[l]) {
        const rest = { ...d.customTexts };
        delete rest[l];
        d.customTexts = rest;
      }
      // Тот же экран, обновлённые галочки — без нового сообщения
      const { text, markup } = langsScreen(c);
      await editOrSend(c, text, markup);
      return { stay: true };
    }
    if (kind === "own" && d.customText && d.langs?.includes(l)) {
      c.s.langText = l;
      return { to: "langText" };
    }
    return null;
  },
};

export const langText: Step = {
  async ask(c) {
    const l = c.s.langText ?? "ru";
    await send(c, c.tx.langs.ownAsk(c.tx.langs.names[l]), inline([backRow(c)]));
  },
  async onMessage(c) {
    if (c.u.kind !== "text") return null;
    const l = c.s.langText;
    const own = cleanOwnText(c.u.text);
    if (!l || !("value" in own)) return own && "problem" in own && own.problem === "long" ? { hint: c.tx.text.tooLong(graphemes(c.u.text)) } : null;
    const d = data(c);
    d.customTexts = { ...d.customTexts, [l]: own.value };
    return { to: "langs" };
  },
};

const trackTitle = (c: Ctx, m: { titleUz: string; titleRu: string }) => (c.lang === "ru" ? m.titleRu : m.titleUz);

export const musicList: Step = {
  async ask(c) {
    const list = await c.deps.repo.listMusic(c.s.occasion);
    const rows = list.map((m) => [ib(c, c.tx.music.play(trackTitle(c, m)), `p:${m.id}`), ib(c, c.tx.music.choose, `s:${m.id}`)]);
    await send(c, c.tx.music.listAsk, inline([...rows, backRow(c)]));
  },
  async onButton(c, v) {
    const list = await c.deps.repo.listMusic(c.s.occasion);
    const m = list.find((x) => x.id === v.slice(2));
    if (!m) return null;
    if (v.startsWith("p:")) {
      let sent;
      try {
        sent = await c.deps.tg.sendAudio(c.chatId, m.telegramFileId ?? m.fileUrl, { title: trackTitle(c, m) });
      } catch (e) {
        // No URL/token in logs; a failed preview must not change the chosen music.
        console.error("previewMusic", e instanceof Error ? e.name : "Error");
        await send(c, c.tx.music.previewFailed);
        return { stay: true };
      }
      if (!m.telegramFileId && sent.fileId) await c.deps.repo.setMusicTelegramFileId(m.id, sent.fileId);
      return { stay: true };
    }
    if (v.startsWith("s:")) {
      c.s.music = { kind: "list", musicId: m.id };
      return { to: afterMusic(c) };
    }
    return null;
  },
};

const AUDIO_EXT = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac)$/i;

export const musicOwn: Step = {
  async ask(c) {
    await send(c, c.tx.music.ownAsk, inline([backRow(c)]));
  },
  async onMessage(c): Promise<Result> {
    const u = c.u;
    const isAudioDoc = u.kind === "document" && (/^audio\//.test(u.mimeType ?? "") || AUDIO_EXT.test(u.fileName ?? ""));
    if (u.kind !== "audio" && !isAudioDoc) return { hint: c.tx.music.sendFile };
    const file = u as Extract<typeof u, { kind: "audio" | "document" }>;
    if ((file.fileSize ?? 0) > MAX_MUSIC_BYTES) {
      return { hint: c.tx.music.tooBig(((file.fileSize ?? 0) / 1024 / 1024).toFixed(1)) };
    }
    const title =
      (u.kind === "audio" && [u.performer, u.title].filter(Boolean).join(" — ")) || (file.fileName ?? "").replace(AUDIO_EXT, "") || undefined;
    let url: string | undefined;
    if (c.deps.saveMusic) {
      try {
        url = await c.deps.saveMusic(file.fileId, c.user.id);
      } catch (e) {
        if (e instanceof MusicTooBigError) return { hint: c.tx.music.tooBigUnknown };
        console.error("saveMusic", e instanceof Error ? e.name : "Error");
        await recordBotError(c.deps, toEntry(e, u, c.step, "ack"));
      }
    }
    // This is also required when the storage dependency is missing.
    if (!url || !/^https:\/\//.test(url)) {
      await send(c, c.tx.music.saveFailed);
      return { stay: true };
    }
    c.s.music = { kind: "own", fileId: file.fileId, url, ...(title ? { title } : {}) };
    await send(c, c.tx.music.saved);
    return { to: afterMusic(c) };
  },
};

/**
 * «Бот сиз учун танлади»: после тадбиров не задаём вопросы про текст, музыку и ответы гостей —
 * ставим лучшее (текст №1, первая мелодия тадбира, ответы включены) и сразу показываем сводку с ✏️.
 */
export async function chosenByBot(c: Ctx): Promise<Result> {
  const d = data(c);
  if (!d.customText && !d.textId) d.textId = t.inviteOptions(finalData(c.s))[0]?.id;
  if (!c.s.music) {
    const first = (await c.deps.repo.listMusic(c.s.occasion))[0];
    c.s.music = first ? { kind: "list", musicId: first.id } : { kind: "none" };
  }
  d.rsvp ??= true;
  return { to: "review" };
}

// ── Сводка ──

async function musicLine(c: Ctx) {
  const m = c.s.music ?? { kind: "none" };
  if (m.kind === "list") {
    const rec = (await c.deps.repo.listMusic(c.s.occasion)).find((x) => x.id === m.musicId);
    return c.tx.review.musicList(rec ? trackTitle(c, rec) : m.musicId);
  }
  if (m.kind === "own") return c.tx.review.musicOwn(m.title ?? "🎵");
  return c.tx.review.musicNone;
}

async function summary(c: Ctx) {
  const r = c.tx.review;
  const d = finalData(c.s);
  const old = c.s.orderId ? await c.deps.repo.getOrder(c.s.orderId) : null;
  // Выбрали другой формат в «✏️ Дизайн», но вернулись без покупки: дизайн прежний — и формат прежний
  // (у старого заказа — формат из заказа: каталог мог потом переклассифицировать дизайн)
  const chosen = c.s.templateId ? getDesign(c.s.templateId) : undefined;
  if (old && c.s.templateId === old.templateId) c.s.format = old.format;
  else if (chosen && c.s.format !== chosen.format) c.s.format = chosen.format;
  // согласованная сумма — пока формат тот же; сменили формат до оплаты — цена нового формата
  const quoted = old?.userId === c.user.id && old.format === c.s.format ? old.amount : undefined;
  const lines = [r.title, "", designLine(c.tx, c.s.templateId ?? "", c.s.format ?? "animated", quoted)];
  if (d.occasion === "nikoh") lines.push(r.groom(d.groom ?? ""), r.bride(d.bride ?? ""));
  else lines.push(r.person(d.person ?? ""));
  if (d.relation) {
    const label = d.occasion === "nikoh" ? c.tx.form.relationsNikoh[d.relation] : c.tx.form.relations[d.relation];
    lines.push(r.relation(label ?? d.relation));
  }
  if (d.occasion === "yubiley" && d.age) lines.push(r.age(d.age));
  if (d.occasion === "nahorgi" && d.cause) lines.push(r.cause(c.tx.form.causes[d.cause as "nikoh" | "sunnat"] ?? d.cause));
  lines.push(r.hosts(d.hosts ?? ""));
  if (d.sides?.groom) lines.push(c.tx.review.sideGroom(d.sides.groom));
  if (d.sides?.bride) lines.push(r.sideBride(d.sides.bride));
  lines.push("");
  d.events.forEach((e, i) => {
    const map = e.location || e.mapUrl ? r.hasMap : r.noMap;
    lines.push(r.event(i + 1, eventLabel(c.tx, e.kind), fmtDate(e.date), e.time, e.venueName, e.address, map));
  });
  lines.push("");
  if (d.customText) lines.push(r.textOwn([...d.customText].slice(0, 40).join("")));
  else {
    const i = t.inviteOptions(d).findIndex((o) => o.id === d.textId);
    lines.push(r.textPreset(Math.max(i, 0) + 1));
  }
  lines.push(await musicLine(c));
  lines.push(d.rsvp ? c.tx.rsvp.reviewOn : c.tx.rsvp.reviewOff);
  lines.push(c.tx.langs.review((d.langs ?? []).map((l) => c.tx.langs.names[l]).join(" · ")));
  if (d.mainLang && d.langs?.includes(d.mainLang)) lines.push(c.tx.langs.main(c.tx.langs.names[d.mainLang]));
  if (photoStepFor(c)) lines.push(c.tx.photo.review(d.photos?.length ?? 0));
  return { text: lines.join("\n"), d };
}

export const review: Step = {
  async ask(c) {
    // Стек «Назад» из сводки — как при первом приходе (правки не копят шаги)
    c.s.back ??= [];
    if (c.s.reviewDepth === undefined) c.s.reviewDepth = c.s.back.length;
    else c.s.back = c.s.back.slice(0, c.s.reviewDepth);
    delete c.s.ret;
    const { text, d } = await summary(c);
    const r = c.tx.review;
    const rows: InlineButton[][] = [[ib(c, r.editNames, "names"), ib(c, r.editRelation, "relation")]];
    const row2 = [ib(c, r.editHosts, "hosts")];
    if (d.occasion === "nikoh") row2.push(ib(c, r.editSides, "sides"));
    if (d.occasion === "nahorgi") row2.push(ib(c, r.editCause, "cause"));
    if (d.occasion === "yubiley") row2.push(ib(c, r.editAge, "age"));
    rows.push(row2);
    d.events.forEach((e, i) => rows.push([ib(c, r.editEvent(i + 1, eventLabel(c.tx, e.kind)), `ev:${i}`)]));
    rows.push([ib(c, r.editText, "text"), ib(c, r.editMusic, "music"), ib(c, r.editDesign, "design")]);
    rows.push(photoStepFor(c) ? [ib(c, c.tx.rsvp.edit, "rsvp"), ib(c, c.tx.photo.edit, "photo")] : [ib(c, c.tx.rsvp.edit, "rsvp"), ib(c, c.tx.langs.edit, "langs")]);
    if (photoStepFor(c)) rows.push([ib(c, c.tx.langs.edit, "langs")]);
    rows.push([ib(c, r.confirm, "ok")]);
    if (c.s.back.length) rows.push(backRow(c));
    await send(c, text, inline(rows));
  },
  async onButton(c, v): Promise<Result> {
    const edit = (to: Parameters<typeof goEdit>[1]) => goEdit(c, to);
    switch (v) {
      case "names":
        return edit(c.s.occasion === "nikoh" ? "groom" : "person");
      case "relation":
        return edit("relation");
      case "hosts":
        return edit("hosts");
      case "sides":
        return edit("sideAsk");
      case "cause":
        return edit("cause");
      case "age":
        return edit("age");
      case "text":
        return edit("text");
      case "music":
        return edit("music");
      case "rsvp":
        return edit("rsvp");
      case "langs":
        return edit("langs");
      case "photo":
        return photoStepFor(c) ? edit("photoAsk") : null;
      case "design":
        // До оплаты — любой дизайн тадбира (другая цена — при сохранении); каталог открывается на странице текущего
        c.s.catIdx = pageOf(catalogList(c), c.s.templateId);
        return edit("catalog");
      case "ok":
        return confirmDraft(c);
    }
    if (v.startsWith("ev:")) {
      const i = Number(v.slice(3));
      if (!data(c).events[i]) return null;
      c.s.ev = i;
      return { to: "evMenu" };
    }
    return null;
  },
};

function goEdit(c: Ctx, to: "groom" | "person" | "relation" | "hosts" | "sideAsk" | "cause" | "age" | "text" | "music" | "rsvp" | "langs" | "photoAsk" | "fmt" | "catalog"): Result {
  c.s.ret = "review";
  return { to };
}

export const evMenu: Step = {
  async ask(c) {
    const r = c.tx.review;
    const i = c.s.ev ?? 0;
    const e = data(c).events[i];
    const rows: InlineButton[][] = [
      [ib(c, r.evDate, "date"), ib(c, r.evTime, "time")],
      [ib(c, r.evVenue, "venue"), ib(c, r.evAddress, "address")],
      [ib(c, r.evLocation, "loc")],
    ];
    if (i > 0) rows.push([ib(c, r.evDelete, "del")]);
    rows.push(backRow(c));
    await send(c, r.eventMenu(eventLabel(c.tx, e?.kind ?? "nikohBazm")), inline(rows));
  },
  async onButton(c, v) {
    const map = { date: "evDate", time: "evTime", venue: "evVenue", address: "evAddress", loc: "evLoc" } as const;
    if (v in map) {
      c.s.ret = "review";
      return { to: map[v as keyof typeof map] };
    }
    if (v === "del" && (c.s.ev ?? 0) > 0) {
      data(c).events.splice(c.s.ev ?? 0, 1);
      c.s.ev = 0;
      return { to: "review" };
    }
    return null;
  },
};
