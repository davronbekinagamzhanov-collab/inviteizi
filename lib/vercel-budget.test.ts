/** п.17: расход Vercel Hobby — без оптимизации картинок на лету, статика в кэше на год, готовые миниатюры каталога */
import { existsSync, statSync } from "node:fs";
import { expect, it } from "vitest";
import config from "../next.config";
import { designs, thumbOf } from "@/templates/registry";

it("next/image не оптимизирует на лету; обложки, арт и музыка кэшируются на год", async () => {
  expect(config.images?.unoptimized).toBe(true);
  const rules = await config.headers!();
  for (const dir of ["/covers/:path*", "/art/:path*", "/music/:path*", "/audio/:path*"]) {
    expect(rules.find((r) => r.source === dir)?.headers[0].value).toContain("max-age=31536000");
  }
});

it("у каждой обложки есть готовая миниатюра WebP ≤ 60 КБ", () => {
  for (const d of designs) {
    if (!existsSync(`public${d.cover}`)) continue;
    const thumb = `public${thumbOf(d.cover).split("?")[0]}`;
    expect(existsSync(thumb), thumb).toBe(true);
    expect(statSync(thumb).size).toBeLessThan(60_000);
  }
});
