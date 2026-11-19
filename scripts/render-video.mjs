// Видео «Сақлаб олиш» (19.11.2026): MP4 9:16, 12–14 с — конверт/первый экран → имена → дата и место →
// последний кадр «Таклифномани очинг» + ссылка; музыка заказа (или демо-мелодия). H.264 + AAC, ≤ 15 МБ.
// Запускается в GitHub Actions (.github/workflows/render-video.yml) по repository_dispatch от бота:
//   JOB='<json client_payload>' BLOB_READ_WRITE_TOKEN=… RENDER_CALLBACK_SECRET=… node scripts/render-video.mjs
// Локально (без загрузки и ответа боту):  JOB='…' node scripts/render-video.mjs --out /tmp/video.mp4
import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { mkdtempSync, readFileSync, statSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const MAX_BYTES = 15 * 1024 * 1024;
const LENGTH = 13.5; // секунд
const job = JSON.parse(process.env.JOB ?? "{}");
const outArg = process.argv.indexOf("--out");
const localOut = outArg > 0 ? process.argv[outArg + 1] : null;
const secret = process.env.RENDER_CALLBACK_SECRET;

for (const k of ["orderId", "slug", "url", "cta", "link", "paper", "ink"])
  if (typeof job[k] !== "string" || !job[k]) throw new Error(`JOB.${k} нет`);
if (!/^[a-z0-9-]{1,60}$/.test(job.slug)) throw new Error("slug");
if (!/^#[0-9a-f]{6}$/i.test(job.paper) || !/^#[0-9a-f]{6}$/i.test(job.ink)) throw new Error("цвета");

async function report(status, extra = {}) {
  if (localOut || !job.callback || !secret) return;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(job.callback, {
        method: "POST",
        headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
        body: JSON.stringify({ orderId: job.orderId, status, ...extra }),
        signal: AbortSignal.timeout(30_000),
      });
      if (res.ok) return;
      console.error("ответ боту", res.status);
    } catch (e) {
      console.error("ответ боту", e?.name);
    }
    await new Promise((r) => setTimeout(r, 3000 * (i + 1)));
  }
}

async function record(dir) {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME || undefined,
    args: ["--autoplay-policy=no-user-gesture-required"],
  });
  const context = await browser.newContext({
    viewport: { width: 360, height: 640 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto(job.url, { waitUntil: "load", timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  // Кадры экрана в настоящем разрешении телефона (720×1280) с отметкой времени — запись Playwright даёт 360 px
  const cdp = await context.newCDPSession(page);
  const frames = [];
  cdp.on("Page.screencastFrame", (f) => {
    frames.push({ data: f.data, t: f.metadata.timestamp });
    cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 720, maxHeight: 1280, everyNthFrame: 1 });
  const begin = Date.now() / 1000;
  await page.waitForTimeout(5200); // 1,6 с закрытый конверт + открытие
  // дата и место: мягко листаем вниз (не дальше 1,4 экрана)
  await page.evaluate(async () => {
    const max = Math.min(document.documentElement.scrollHeight - innerHeight, innerHeight * 1.4);
    const steps = 90;
    for (let i = 1; i <= steps; i++) {
      const p = i / steps;
      window.scrollTo(0, max * (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2));
      await new Promise((r) => setTimeout(r, 50));
    }
  });
  await page.waitForTimeout(600);
  // последний кадр: «Таклифномани очинг» + ссылка в цветах дизайна
  await page.evaluate(({ cta, link, paper, ink }) => {
    const d = document.createElement("div");
    d.style.cssText = `position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:${paper};color:${ink};opacity:0;transition:opacity .7s ease;text-align:center;padding:0 28px;font-family:Georgia,'Times New Roman',serif`;
    const a = document.createElement("div");
    a.textContent = cta;
    a.style.cssText = "font-size:34px;line-height:1.2;font-style:italic";
    const line = document.createElement("div");
    line.style.cssText = `width:70px;height:1px;background:${ink};opacity:.5`;
    const b = document.createElement("div");
    b.textContent = link;
    b.style.cssText = "font-size:19px;letter-spacing:.3px;opacity:.85;word-break:break-all";
    d.append(a, line, b);
    document.body.append(d);
    requestAnimationFrame(() => (d.style.opacity = "1"));
  }, job);
  await page.waitForTimeout(3200);
  const end = Date.now() / 1000;
  await cdp.send("Page.stopScreencast").catch(() => {});
  await context.close();
  await browser.close();
  if (frames.length < 10) throw new Error(`видео не записалось (${frames.length} кадров)`);
  // Последовательность кадров с их длительностью (кадр приходит только когда экран меняется)
  const list = [];
  frames.forEach((f, i) => {
    const file = path.join(dir, `f${String(i).padStart(5, "0")}.jpg`);
    writeFileSync(file, Buffer.from(f.data, "base64"));
    const next = i + 1 < frames.length ? frames[i + 1].t : end;
    list.push(`file '${file}'`, `duration ${Math.max(0.001, next - f.t).toFixed(4)}`);
  });
  list.push(`file '${path.join(dir, `f${String(frames.length - 1).padStart(5, "0")}.jpg`)}'`);
  const concat = path.join(dir, "frames.txt");
  writeFileSync(concat, list.join("\n") + "\n");
  return { concat, start: Math.max(0, frames[0].t - begin) };
}

async function music(dir) {
  if (!job.musicUrl) return null;
  const res = await fetch(job.musicUrl, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) {
    console.error("музыка", res.status);
    return null;
  }
  const f = path.join(dir, "music");
  writeFileSync(f, Buffer.from(await res.arrayBuffer()));
  return f;
}

function encode(concat, audio, out, bitrate) {
  const args = ["-y", "-f", "concat", "-safe", "0", "-i", concat];
  // короткая песня (своя, 5–10 с) повторяется — видео не обрывается раньше последнего кадра
  if (audio) args.push("-stream_loop", "-1", "-i", audio);
  else args.push("-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100");
  args.push(
    "-t", String(LENGTH),
    "-map", "0:v:0", "-map", "1:a:0",
    "-vf", "scale=720:1280:flags=lanczos,fps=30,format=yuv420p",
    "-c:v", "libx264", "-profile:v", "main", "-level", "4.0", "-preset", "medium",
    ...(bitrate ? ["-b:v", bitrate, "-maxrate", bitrate, "-bufsize", "8M"] : ["-crf", "21"]),
    "-af", `afade=t=in:d=0.4,afade=t=out:st=${LENGTH - 1.2}:d=1.2`,
    "-c:a", "aac", "-b:a", "128k", "-ar", "44100",
    "-movflags", "+faststart", "-shortest", out,
  );
  execFileSync("ffmpeg", args, { stdio: ["ignore", "ignore", "inherit"] });
}

async function upload(file) {
  const { put } = await import("@vercel/blob");
  const folder = createHmac("sha256", secret).update("inviteizi:keepsake:v1\0").update(job.orderId).digest("hex").slice(0, 32);
  const r = await put(`keepsake/${folder}/${job.slug}-video.mp4`, readFileSync(file), {
    access: "public",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    contentType: "video/mp4",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 31_536_000,
  });
  return r.url;
}

const dir = mkdtempSync(path.join(tmpdir(), "inviteizi-video-"));
try {
  await report("running");
  const { concat } = await record(dir);
  const audio = await music(dir);
  const out = localOut ?? path.join(dir, "out.mp4");
  encode(concat, audio, out);
  if (statSync(out).size > MAX_BYTES) encode(concat, audio, out, "5M");
  const size = statSync(out).size;
  if (size > MAX_BYTES) throw new Error(`видео ${size} байт > 15 МБ`);
  console.log("видео", out, size, "байт");
  if (!localOut) await report("done", { url: await upload(out) });
} catch (e) {
  console.error(e);
  await report("failed", { error: `${e?.name ?? "Error"}: ${e?.message ?? ""}`.slice(0, 280) });
  process.exitCode = 1;
} finally {
  if (!localOut) rmSync(dir, { recursive: true, force: true });
}
