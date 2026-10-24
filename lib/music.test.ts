import { existsSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MUSIC_FOLDERS, demoMusicUrl, trackFileName } from "./music";
import { musicTitles, titleFromFile } from "@/texts/music-titles";
import type { Occasion } from "./types";

describe("музыка: имена файлов и названия", () => {
  it("имя файла → латиница kebab-case без мусора", () => {
    expect(trackFileName("Janob Rasul - To'y-to'y.mp3")).toBe("janob-rasul-toy-toy");
    expect(trackFileName("ravshan-komilov-toy-bola_(uzhits.net).mp3")).toBe("ravshan-komilov-toy-bola");
    expect(trackFileName("masrur-usmonov-toylar-muborak-2015_(uzhits.net).mp3")).toBe("masrur-usmonov-toylar-muborak");
    expect(trackFileName("Нилуфар Усмонова - Yor-yor.mp3")).toBe("nilufar-usmonova-yor-yor");
  });

  it("название без записи в каталоге — из имени файла: «Исполнитель — Қўшиқ», без мусора", () => {
    expect(titleFromFile("Janob Rasul - To'y-to'y (uzhits.net)").uz).toBe("Janob Rasul — To'y-to'y");
    expect(titleFromFile("yangi-qoshiq_2024").uz).toBe("yangi qoshiq");
  });

  it("у каждого тадбира есть мелодия для демо, и её файл лежит в своей папке", () => {
    for (const o of Object.keys(MUSIC_FOLDERS) as Occasion[]) {
      const url = demoMusicUrl(o);
      expect(url, o).toMatch(new RegExp(`/music/${MUSIC_FOLDERS[o]}/[a-z0-9-]+\.mp3$`));
      const name = url!.split("/").at(-1)!;
      // файлы музыки не в git (живут в хранилище) — на чистой копии папок нет
      if (existsSync(`public/music/${MUSIC_FOLDERS[o]}`)) {
        expect(existsSync(`public/music/${MUSIC_FOLDERS[o]}/${name}`), `${o}: ${name}`).toBe(true);
      }
    }
  });

  it("у каждого файла в папках есть красивое название в texts/music-titles.ts", () => {
    for (const folder of Object.values(MUSIC_FOLDERS)) {
      if (!existsSync(`public/music/${folder}`)) continue;
      for (const f of readdirSync(`public/music/${folder}`).filter((x) => x.endsWith(".mp3"))) {
        expect(musicTitles[f.replace(/\.mp3$/, "")], `${folder}/${f}`).toBeDefined();
      }
    }
  });
});
