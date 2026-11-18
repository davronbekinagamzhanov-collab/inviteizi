// Read-only asset inventory and local production browser check. No DB, gate, sync or writes to Storage.
// 19.11.2026: отключён — читал песни из Supabase Storage (с 16.11 отвечает 402). Что реально играет — тест
// lib/music-available.test.ts (каждый адрес → файл в public/), прод — утренняя проверка bot/daily-check.ts.
console.error("Скрипт отключён: песни больше не в Supabase Storage (402). Проверка музыки: npx vitest run lib/music-available.test.ts");
process.exit(1);
import "./ts-hooks.mjs";
import { chromium } from "playwright-core";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const { musicTitles } = await import("../texts/music-titles.ts");
const { demoMusicUrl, trackPath } = await import("../lib/music.ts");
const { activeDesigns } = await import("../templates/registry.ts");
const { t } = await import("../texts/uz-cyrl.ts");
const base = process.env.CHECK_BASE_URL ?? "http://127.0.0.1:3116";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Local app only");
const out = process.env.CHECK_OUT ?? "docs/reviews/2026-10-28-task3-music.json";
const groups = {
  nikoh: Object.keys(musicTitles).slice(0, 11),
  nahorgi: ["masrur-usmonov-toylar-muborak", "tonggi-qozon"],
  sunnat: ["ravshan-komilov-toy-bola", "oq-ot"],
  yubiley: ["pion-guldasta"],
};
// Snapshot scope, not a second runtime catalog. Refuse to silently omit future titles.
const names = Object.values(groups).flat();
if (new Set(names).size !== Object.keys(musicTitles).length || names.some(n => !musicTitles[n])) throw new Error("Update inventory scope for changed music titles");
const assets = [], playback = [], failures = [], bodies = new Map();
for (const [occasion, names] of Object.entries(groups)) {
  for (const name of names) {
    const url = new URL(trackPath(occasion, name), "https://hjakyirmyauqhurkqhsn.supabase.co/storage/v1/object/public/music/").href;
    const demo = musicTitles[name].demo === occasion;
    try {
      const res = await fetch(url, { method: demo ? "GET" : "HEAD", signal: AbortSignal.timeout(20_000) });
      const row = { occasion, name, url, status: res.status, contentType: res.headers.get("content-type"), bytes: Number(res.headers.get("content-length")), licenseVerified: false };
      if (demo && res.ok) {
        const bytes = Buffer.from(await res.arrayBuffer());
        row.bytes = bytes.length; row.sha256 = createHash("sha256").update(bytes).digest("hex");
        bodies.set(occasion, bytes);
      }
      assets.push(row);
    } catch (e) { assets.push({ occasion, name, url, error: e.name, licenseVerified: false }); }
  }
}
const localBytes = await readFile("public/music/namuna-kuy.wav");
const local = { path: "public/music/namuna-kuy.wav", bytes: localBytes.length, sha256: createHash("sha256").update(localBytes).digest("hex"), purpose: "generated test placeholder, not an accepted licensed catalog composition" };
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const [occasion] of Object.entries(groups)) {
    const bytes = bodies.get(occasion);
    if (!bytes) { failures.push(`${occasion}: demo download unavailable`); continue; }
    const design = activeDesigns().find(d => d.occasion === occasion && d.format === "simple");
    for (const width of [320, 360, 375, 430]) {
      const context = await browser.newContext({ viewport: { width, height: 812 }, isMobile: true, hasTouch: true });
      // The actual downloaded public demo file, not synthetic PCM; bytes are kept only in memory.
      await context.route("**/storage/v1/object/public/music/**", r => r.fulfill({ status: 200, contentType: "audio/mpeg", body: bytes }));
      const page = await context.newPage();
      try {
        await page.goto(`${base}/demo/${design.id}`, { waitUntil: "networkidle" });
        const noAutoplay = await page.locator("audio").evaluate(a => a.paused && a.currentTime === 0 && !a.autoplay);
        await page.getByRole("button", { name: t.music.play, exact: true }).tap();
        await page.waitForFunction(() => { const a = document.querySelector("audio"); return a && !a.paused && a.currentTime > 0; });
        const duration = await page.locator("audio").evaluate(a => a.duration);
        // Explicit error-event regression: pause UI must reset even without a pause event.
        await page.locator("audio").evaluate(a => a.dispatchEvent(new Event("error")));
        const errorResetsButton = await page.getByRole("button", { name: t.music.play, exact: true }).count() === 1;
        await page.locator("audio").evaluate(a => a.pause());
        await page.getByRole("button", { name: t.music.play, exact: true }).tap();
        await page.waitForFunction(() => !document.querySelector("audio").paused);
        await page.getByRole("button", { name: t.music.pause, exact: true }).tap();
        const pauses = await page.locator("audio").evaluate(a => a.paused);
        // Missing object: actual 404 response, no synthetic play success.
        await context.unroute("**/storage/v1/object/public/music/**");
        await context.route("**/missing-music.mp3", r => r.fulfill({ status: 404, body: "missing" }));
        await page.locator("audio").evaluate(a => { a.src = "/missing-music.mp3"; a.load(); });
        await page.getByRole("button", { name: t.music.play, exact: true }).tap();
        await page.waitForFunction(() => document.querySelector("audio").error !== null);
        const missingDoesNotPlay = await page.locator("audio").evaluate(a => a.paused);
        const missingButton = await page.getByRole("button", { name: t.music.play, exact: true }).count() === 1;
        playback.push({ occasion, design: design.id, width, source: demoMusicUrl(occasion), duration, noAutoplay, plays: true, pauses, errorResetsButton, missingDoesNotPlay, missingButton });
      } catch (e) { failures.push(`${occasion}/${width}: ${e.message}`); }
      await context.close();
    }
  }
  const page = await browser.newPage();
  const decoded = await page.evaluate(async encoded => {
    const ctx = new AudioContext();
    try { const buf = Uint8Array.from(atob(encoded), c => c.charCodeAt(0)); const audio = await ctx.decodeAudioData(buf.buffer); return { duration: audio.duration, channels: audio.numberOfChannels, sampleRate: audio.sampleRate }; }
    finally { await ctx.close(); }
  }, localBytes.toString("base64"));
  Object.assign(local, { decoded });
} finally { await browser.close(); }
const passed = playback.length === 16 && playback.every(r => r.noAutoplay && r.plays && r.pauses && r.errorResetsButton && r.missingDoesNotPlay && r.missingButton) && failures.length === 0;
const report = { checkedAt: new Date().toISOString(), scope: "read-only known public paths, local production app, actual demo MP3 bytes; no production DB/Telegram/customer file access; no license verification", titles: Object.keys(musicTitles).length, databaseRows: null, storageListing: null, verifiedLicenses: 0, assets, local, playback, failures, passed };
await writeFile(out, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ out, titles: report.titles, knownStorageAvailable: assets.filter(a => a.status === 200).length, playbackCases: playback.length, failures, passed }));
if (!passed) process.exitCode = 1;
