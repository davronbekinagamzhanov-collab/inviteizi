import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import originals from "@/music/originals/manifest.json";
import { AUDIO_FILES, DEMO_TRACK, MIN_TRACKS, MUSIC_BORROW, isPlayableMusicUrl, localAudioPath, playableMusic } from "./music-available";
import { demoMusicUrl } from "./music";
import { invitationData } from "./orders";
import type { OrderRecord } from "./domain";
import type { Occasion } from "./types";

const OCCASIONS: Occasion[] = ["nikoh", "nahorgi", "sunnat", "yubiley"];
const SITE = "https://inviteizi.vercel.app";
/** Таблица music так, как она выглядит в проде: 12 своих мелодий на сайте + песни в Supabase Storage (402) */
const rows = [
  ...originals.map((o, i) => ({ id: o.id, fileUrl: `${SITE}/audio/originals/${o.id}.mp3`, occasion: o.occasion as Occasion, sort: 100 + i })),
  { id: "nikoh-atlas-ozbekiston", fileUrl: "https://hjakyirmyauqhurkqhsn.supabase.co/storage/v1/object/public/music/nikoh/atlas-ozbekiston.mp3", occasion: "nikoh" as Occasion, sort: 1 },
  { id: "nahorgi-tonggi-qozon", fileUrl: "https://hjakyirmyauqhurkqhsn.supabase.co/storage/v1/object/public/music/nahorgi-osh/tonggi-qozon.mp3", occasion: "nahorgi" as Occasion, sort: 1 },
  { id: "sunnat-oq-ot", fileUrl: "https://hjakyirmyauqhurkqhsn.supabase.co/storage/v1/object/public/music/sunnat/oq-ot.mp3", occasion: "sunnat" as Occasion, sort: 1 },
];

describe("музыка: только играющие файлы", () => {
  it("lib/audio-files.json совпадает с public/audio (иначе — node scripts/audio-files.mjs)", () => {
    execFileSync("node", ["scripts/audio-files.mjs", "--check"]);
    for (const f of AUDIO_FILES) expect(existsSync(`public${f}`), f).toBe(true);
    expect(AUDIO_FILES.size).toBeGreaterThanOrEqual(12);
  });

  it("адреса: свой сайт и /audio — да; Supabase, чужой сайт, нет файла — нет", () => {
    expect(localAudioPath(`${SITE}/audio/originals/inviteizi-yubiley-diydor.mp3`)).toBe("/audio/originals/inviteizi-yubiley-diydor.mp3");
    expect(isPlayableMusicUrl("/audio/originals/inviteizi-yubiley-diydor.mp3?r=1")).toBe(true);
    expect(isPlayableMusicUrl(rows.at(-1)!.fileUrl)).toBe(false);
    expect(isPlayableMusicUrl("https://evil.example/audio/originals/inviteizi-yubiley-diydor.mp3")).toBe(false);
    expect(isPlayableMusicUrl(`${SITE}/audio/lib/nikoh/net-takogo.mp3`)).toBe(false);
    expect(isPlayableMusicUrl("")).toBe(false);
    expect(isPlayableMusicUrl(null)).toBe(false);
    expect(isPlayableMusicUrl("::bad")).toBe(false);
  });

  it(`у каждого тадбира ≥ ${MIN_TRACKS} песен, все играют, без повторов; песни Supabase не показываются`, () => {
    for (const o of OCCASIONS) {
      const list = playableMusic(rows, o);
      expect(list.length, o).toBeGreaterThanOrEqual(MIN_TRACKS);
      expect(new Set(list.map((m) => m.id)).size).toBe(list.length);
      for (const m of list) {
        expect(isPlayableMusicUrl(m.fileUrl), m.id).toBe(true);
        expect(existsSync(`public${localAudioPath(m.fileUrl)}`)).toBe(true);
      }
    }
    expect(playableMusic(rows).some((m) => m.fileUrl.includes("supabase"))).toBe(false);
    // свои — первыми
    expect(playableMusic(rows, "sunnat").every((m) => m.occasion === "sunnat")).toBe(true);
  });

  it("пустая таблица — пустой список, без ошибок", () => {
    for (const o of OCCASIONS) expect(playableMusic([], o)).toEqual([]);
  });

  it("мелодии «взаймы» и демо-мелодии — существующие файлы", () => {
    const ids = new Set(originals.map((o) => o.id));
    for (const o of OCCASIONS) {
      for (const id of MUSIC_BORROW[o]) expect(ids.has(id), id).toBe(true);
      expect(ids.has(DEMO_TRACK[o])).toBe(true);
      const url = demoMusicUrl(o)!;
      expect(AUDIO_FILES.has(url), url).toBe(true);
      expect(existsSync(`public${url}`)).toBe(true);
    }
  });

  it("SQL music-available.sql: все адреса, которые он включает, есть на сайте", () => {
    const sql = readFileSync("supabase/release/music-available.sql", "utf8");
    const urls = [...sql.matchAll(/'(https:\/\/inviteizi\.vercel\.app\/audio\/[^'%]+)'/g)].map((m) => m[1]);
    expect(urls.length).toBe(12);
    for (const u of urls) expect(isPlayableMusicUrl(u), u).toBe(true);
  });
});

describe("заказ с недоступной песней играет демо-мелодию своего тадбира", () => {
  const order = (music: OrderRecord["music"], occasion: Occasion = "nikoh") =>
    ({ slug: "aziz-madina", occasion, music, data: { events: [] } }) as unknown as OrderRecord;

  it("песня из списка в Supabase → демо тадбира", () => {
    for (const o of OCCASIONS) {
      const d = invitationData(order({ kind: "list", musicId: "x" }, o), rows.at(-1)!.fileUrl);
      expect(d.musicUrl).toBe(demoMusicUrl(o));
      expect(d.noMusic).toBeUndefined();
    }
  });
  it("строки песни нет в базе → демо тадбира", () => {
    expect(invitationData(order({ kind: "list", musicId: "x" }), null).musicUrl).toBe(demoMusicUrl("nikoh"));
  });
  it("играющая песня — без изменений", () => {
    const url = `${SITE}/audio/originals/inviteizi-yubiley-diydor.mp3`;
    expect(invitationData(order({ kind: "list", musicId: "x" }), url).musicUrl).toBe(url);
  });
  it("своя песня: Blob — как есть; старый Supabase (402) — демо", () => {
    const blob = "https://abc.public.blob.vercel-storage.com/music/own/a.mp3";
    expect(invitationData(order({ kind: "own", url: blob, fileId: "f" } as OrderRecord["music"])).musicUrl).toBe(blob);
    const old = "https://hjakyirmyauqhurkqhsn.supabase.co/storage/v1/object/public/music/own/a.mp3";
    expect(invitationData(order({ kind: "own", url: old, fileId: "f" } as OrderRecord["music"])).musicUrl).toBe(demoMusicUrl("nikoh"));
  });
  it("без музыки — тишина по выбору клиента", () => {
    expect(invitationData(order({ kind: "none" })).noMusic).toBe(true);
  });
});
