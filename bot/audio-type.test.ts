import { describe, expect, it } from "vitest";
import { audioFileInfo } from "./audio-type";

describe("audioFileInfo — тип файла песни для Storage по пути из Telegram", () => {
  it.each([
    ["music/file_1.mp3", "mp3", "audio/mpeg"],
    ["documents/file_2.M4A", "m4a", "audio/mp4"],
    ["music/file_3.ogg", "ogg", "audio/ogg"],
    ["music/file_4.oga", "ogg", "audio/ogg"],
    ["music/file_5.wav", "wav", "audio/wav"],
    ["music/file_6.flac", "flac", "audio/flac"],
    ["music/file_7.aac", "aac", "audio/aac"],
    ["music/file_8", "mp3", "audio/mpeg"],
  ])("%s → %s, %s", (p, ext, contentType) => expect(audioFileInfo(p)).toEqual({ ext, contentType }));
});
