import { describe, expect, it } from "vitest";
import { t } from "@/texts/uz-cyrl";
import { designs, ACCEPTED } from "@/templates/registry";
import { existsSync } from "node:fs";
import unsplash from "./unsplash.json";
import local from "./local-photos.json";

const PILOTS = ["muhr", "ipak", "bog", "tong-dasturxon"];

describe("натуральные пилоты", () => {
  it("рукописные слова набраны без қ ғ ҳ (их нет в Great Vibes)", () => {
    const words = Object.values(t.natural).filter((v) => typeof v === "string") as string[];
    for (const w of words) expect(w, w).not.toMatch(/[ҚқҒғҲҳ]/);
  });

  it("в реестре, приняты, фото клиента (кроме наҳорги ош) и имеют обложки", () => {
    for (const id of PILOTS) {
      const d = designs.find((x) => x.id === id);
      expect(d, id).toBeTruthy();
      // наҳорги ош — без фото клиента (решение владельца 03.11.2026)
      expect(Boolean(d!.clientPhotos), id).toBe(d!.occasion !== "nahorgi");
      expect(ACCEPTED.has(id), id).toBe(true);
      expect(existsSync(`public/covers/${id}.webp`) && existsSync(`public/covers/${id}.jpg`), id).toBe(true);
    }
  });

  it("у каждого фото есть автор и ссылка; Unsplash — по hotlink с images.unsplash.com", () => {
    for (const [slot, p] of Object.entries(unsplash)) {
      expect(p.raw, slot).toMatch(/^https:\/\/images\.unsplash\.com\//);
      expect(p.author && p.authorUrl, slot).toBeTruthy();
    }
    for (const [slot, p] of Object.entries(local)) {
      expect(existsSync(`public${p.src}`), slot).toBe(true);
      expect(p.author && p.source, slot).toBeTruthy();
    }
  });
});
