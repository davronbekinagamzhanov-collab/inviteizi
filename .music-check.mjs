import { chromium, devices } from "playwright-core";
import { readFile } from "node:fs/promises";
const wav = await readFile("public/music/namuna-kuy.wav");
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--autoplay-policy=user-gesture-required"] });
for (const id of (process.argv[2] ?? "muhr,vip-marvarid,vip-tilla-muhr,premium,oltin-monogramma").split(",")) {
  const ctx = await b.newContext({ ...devices["Pixel 7"] });
  const p = await ctx.newPage();
  const reqs = [];
  p.on("request", (r) => /music|audio|\.mp3|\.m4a|\.wav/.test(r.url()) && reqs.push(r.url().slice(-60)));
  await p.route("**/storage/v1/object/public/music/**", (r) => r.fulfill({ status: 200, contentType: "audio/wav", body: wav }));
  await p.goto(`http://localhost:3121/demo/${id}`, { waitUntil: "networkidle", timeout: 120000 });
  const before = await p.evaluate(() => [...document.querySelectorAll("audio")].map((a) => ({ src: a.src.slice(-40), paused: a.paused })));
  const opener = p.locator("[data-open]:not(:disabled)").first();
  if (await opener.count()) await opener.tap({ timeout: 10000 }).catch((e) => console.log("tap fail", e.message.slice(0, 80)));
  else await p.tap("body");
  await p.waitForTimeout(1500);
  const after = await p.evaluate(() => [...document.querySelectorAll("audio")].map((a) => ({ paused: a.paused, err: a.error?.code ?? null, rs: a.readyState })));
  const btn = await p.locator("[data-music-button]").first().getAttribute("aria-label").catch(() => null);
  console.log(id, JSON.stringify({ before, after, btn, reqs }));
  await ctx.close();
}
await b.close();
