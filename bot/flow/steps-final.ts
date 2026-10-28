/** Текст приглашения, музыка, сводка и правка тадбира из сводки */
import type { Ctx, Result, Step } from "./types";
import type { InlineButton } from "../tg";
import { t } from "@/texts/uz-cyrl";
import { designsFor, backRow, data, designLine, eventLabel, finalData, fmtDate, ib, inline, MAX_CUSTOM_TEXT, MAX_MUSIC_BYTES, send } from "./util";
import { confirmDraft } from "./orders";

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
      await c.deps.tg.editMessageText(c.chatId, c.u.messageId, s.text, { markup: s.markup });
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
    const v = c.u.text.trim();
    if (!v) return null;
    const n = [...v].length;
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
      return { to: "review" };
    }
    return null;
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
      return { to: "review" };
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
        console.error("saveMusic", e instanceof Error ? e.name : "Error");
      }
    }
    // This is also required when the storage dependency is missing.
    if (!url) {
      await send(c, c.tx.music.saveFailed);
      return { stay: true };
    }
    c.s.music = { kind: "own", fileId: file.fileId, ...(url ? { url } : {}), ...(title ? { title } : {}) };
    await send(c, c.tx.music.saved);
    return { to: "review" };
  },
};

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
  const quoted = old?.userId === c.user.id ? old.amount : undefined;
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
      case "design":
        if (c.s.paid || c.s.orderId) {
          // A saved quote fixes format and amount; otherwise a cheap order could be upgraded for free.
          const list = designsFor(c.s.occasion ?? "nikoh", c.s.format ?? "animated");
          c.s.catIdx = Math.max(0, list.findIndex((x) => x.id === c.s.templateId));
          return edit("catalog");
        }
        return edit("fmt");
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

function goEdit(c: Ctx, to: "groom" | "person" | "relation" | "hosts" | "sideAsk" | "cause" | "age" | "text" | "music" | "fmt" | "catalog"): Result {
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
