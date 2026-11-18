import { describe, expect, it } from "vitest";
import { audioFileInfo, ownAudioFormat } from "./audio-type";

describe("audioFileInfo — тип своей песни по пути из Telegram (только mp3/m4a, 17.11.2026)", () => {
  it.each([
    ["music/file_1.mp3", "mp3", "audio/mpeg"],
    ["documents/file_2.M4A", "m4a", "audio/mp4"],
    ["documents/file_3.mp4", "m4a", "audio/mp4"],
    ["music/file_8", "mp3", "audio/mpeg"],
  ])("%s → %s, %s", (p, ext, contentType) => expect(audioFileInfo(p)).toEqual({ ext, contentType }));
  it.each(["music/file_3.ogg", "music/file_4.oga", "music/file_5.wav", "music/file_6.flac", "music/file_7.aac"])(
    "%s — не принимаем",
    (p) => expect(audioFileInfo(p)).toBeNull(),
  );
});

describe("ownAudioFormat — формат по имени файла или типу", () => {
  it.each([
    ["song.mp3", null, "mp3"],
    ["Song.M4A", "audio/x-m4a", "m4a"],
    [null, "audio/mpeg", "mp3"],
    [null, "audio/mp4", "m4a"],
    ["voice.ogg", "audio/ogg", null],
    ["track.wav", null, null],
    [null, "audio/ogg", null],
    [null, null, null],
  ] as const)("%s / %s → %s", (name, mime, want) => expect(ownAudioFormat(name, mime)).toBe(want));
});
