// Мелодии дизайнов → MP3 (временные треки «нашего списка»): public/music/<папка тадбира>/<id>.mp3 (~75 с, 128 кбит/с).
// После — node --env-file=.env.local scripts/music-sync.mjs (загрузка и таблица music).
// Запуск (dev-сервер работает): node scripts/render-music.mjs [секунд]
import { chromium } from "playwright-core";
import { Mp3Encoder } from "@breezystack/lamejs";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3000";
const SECONDS = Number(process.argv[2] ?? 75);
// в какой папке тадбира лежит мелодия дизайна
const FOLDER = { "oltin-monogramma": "nikoh", sapfir: "nikoh", "oq-ot": "sunnat", "tonggi-qozon": "nahorgi-osh", "pion-guldasta": "yubiley" };

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage();
await page.goto(`${BASE}/dev/music`, { waitUntil: "load" });
await page.waitForFunction(() => window.__renderMusic);
const ids = await page.evaluate(() => window.__musicIds);

for (const id of ids) {
  const { sampleRate, left, right } = await page.evaluate(([id, s]) => window.__renderMusic(id, s), [id, SECONDS]);
  const l = new Int16Array(Buffer.from(left, "base64").buffer.slice(0));
  const r = new Int16Array(Buffer.from(right, "base64").buffer.slice(0));
  const enc = new Mp3Encoder(2, sampleRate, 128);
  const chunks = [];
  for (let i = 0; i < l.length; i += 1152) {
    const out = enc.encodeBuffer(l.subarray(i, i + 1152), r.subarray(i, i + 1152));
    if (out.length) chunks.push(Buffer.from(out));
  }
  chunks.push(Buffer.from(enc.flush()));
  const mp3 = Buffer.concat(chunks);
  const dir = `public/music/${FOLDER[id] ?? "nikoh"}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/${id}.mp3`, mp3);
  console.log(`${dir}/${id}.mp3 — ${Math.round(mp3.length / 1024)} КБ`);
}
await browser.close();
