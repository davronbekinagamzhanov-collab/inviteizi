import { tmpdir } from "node:os";
import { join } from "node:path";
/** Read-only UI/Preview QA. Synthetic RSVP is demo and must produce zero POSTs. No live bot clicks. */
import { chromium } from "playwright-core";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash, X509Certificate } from "node:crypto";
import assert from "node:assert/strict";
const origin = process.env.MARKETING_ORIGIN ?? "http://localhost:3095",
  out = process.env.MARKETING_OUT ?? join(tmpdir(), "inviteizi-marketing-ui");
await mkdir(out, { recursive: true });
const ca = process.env.NODE_EXTRA_CA_CERTS,
  pin = ca
    ? createHash("sha256")
        .update(new X509Certificate(await readFile(ca)).publicKey.export({ type: "spki", format: "der" }))
        .digest("base64")
    : null;
const b = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox", ...(pin ? [`--ignore-certificate-errors-spki-list=${pin}`] : [])],
  }),
  rows = [];
let storageState;
async function clean(p) {
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  const broken = await p
    .locator("img")
    .evaluateAll((xs) => xs.filter((x) => x.complete && !x.naturalWidth).map((x) => x.getAttribute("src")));
  assert.deepEqual(broken, []);
}
async function badgeSafe(p) {
  const e = p.locator("[data-brand-badge]");
  if ((await e.getAttribute("data-shown")) !== "true") return;
  const r = await e.boundingBox();
  assert.ok(r.x >= 0 && r.x + r.width <= p.viewportSize().width);
  const overlaps = await p.locator("a,button,input,textarea,[data-watermark] > p").evaluateAll(
    (xs, r) =>
      xs
        .filter(
          (x) =>
            !x.closest("[data-brand-badge]") &&
            getComputedStyle(x).visibility !== "hidden" &&
            getComputedStyle(x).display !== "none",
        )
        .filter((x) => {
          const a = x.getBoundingClientRect();
          return (
            a.width && a.height && a.left < r.x + r.width && a.right > r.x && a.top < r.y + r.height && a.bottom > r.y
          );
        })
        .map((x) => x.textContent.slice(0, 60)),
    r,
  );
  assert.deepEqual(overlaps, []);
}
try {
  if (process.env.MARKETING_ACCESS) {
    const a = JSON.parse(await readFile(process.env.MARKETING_ACCESS, "utf8")),
      c = await b.newContext(),
      p = await c.newPage();
    await p.goto(a.url, { waitUntil: "networkidle", timeout: 120000 });
    storageState = await c.storageState();
    await c.close();
  }
  for (const width of [320, 360, 375, 390, 430])
    for (const lang of ["uz", "ru"]) {
      const c = await b.newContext({
          viewport: { width, height: 844 },
          locale: lang === "uz" ? "uz-UZ" : "ru-RU",
          storageState,
        }),
        p = await c.newPage(),
        errors = [];
      let rsvpPosts = 0;
      p.on("pageerror", (e) => errors.push(e.message));
      p.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text());
      });
      p.on("request", (r) => {
        if (r.method() === "POST" && r.url().includes("/api/rsvp")) rsvpPosts++;
      });
      const source = "inv_" + "0".repeat(32);
      assert.equal(
        (
          await p.goto(origin + "/catalog/invite?lang=" + lang + "&ref=" + source, {
            waitUntil: "networkidle",
            timeout: 120000,
          })
        ).status(),
        200,
      );
      await p.evaluate(() => document.fonts.ready);
      assert.equal(await p.locator("article").count(), 3);
      assert.ok((await p.locator("[data-telegram]").first().getAttribute("href")).endsWith("start=" + source));
      for (const href of await p.locator("article a").evaluateAll((xs) => xs.map((x) => x.getAttribute("href"))))
        assert.ok(href.includes("ref=" + source));
      await clean(p);
      if (width === 390) await p.screenshot({ path: out + "/landing-" + lang + ".png", fullPage: true });
      assert.equal(
        (await p.goto(origin + "/dev/marketing?lang=" + lang, { waitUntil: "networkidle", timeout: 120000 })).status(),
        200,
      );
      await p.waitForFunction(() => {
        const e = document.querySelector("[data-opened]");
        return e && getComputedStyle(e.parentElement).visibility !== "hidden";
      });
      await p.waitForFunction((lang) => document.documentElement.lang === lang, lang);
      await p.evaluate(() => document.fonts.ready);
      const badge = p.locator("[data-brand-badge]");
      assert.ok((await badge.getAttribute("href")).includes("ref=" + source));
      const nums = await p.locator("span.tabular-nums").allTextContents();
      assert.ok(Number(nums[0]) >= 44 && Number(nums[0]) <= 46);
      assert.equal(await p.locator("audio").evaluate((x) => x.paused), true);
      const map = p.locator('a[href*="2gis"]').first();
      await map.evaluate((e) => e.scrollIntoView({ block: "center" }));
      await p.waitForTimeout(250);
      assert.equal(await badge.getAttribute("data-shown"), "true");
      await badgeSafe(p);
      if (width === 390) await p.screenshot({ path: out + "/badge-map-" + lang + ".png" });
      const form = p.locator("[data-rsvp]");
      await form.scrollIntoViewIfNeeded();
      await p.waitForTimeout(200);
      await badgeSafe(p);
      await form.locator('input:not([name="website"])').fill("Меҳмон Қодиров");
      await badgeSafe(p);
      await form.locator("button[type=submit]").click();
      await p.waitForTimeout(100);
      assert.equal(rsvpPosts, 0);
      assert.equal(await form.locator("form").count(), 0);
      const switcher = p.locator("[data-lang-switch]");
      await switcher.getByRole("button", { name: lang === "uz" ? "Русский" : "Ўзбекча", exact: true }).click();
      await p.waitForFunction((lang) => document.documentElement.lang !== lang, lang);
      await clean(p);
      if (width === 390) {
        const music = p.locator("[data-music-button]:not([data-music-hint])");
        if ((await music.getAttribute("aria-pressed")) !== "true") await music.click();
        await p.waitForFunction(() => !document.querySelector("audio").paused);
        await music.click();
        await p.waitForFunction(() => document.querySelector("audio").paused);
        const pending = c.waitForEvent("page");
        await map.click();
        const popup = await pending;
        await popup.waitForURL((u) => u.hostname.includes("2gis"), { waitUntil: "commit" });
        await popup.close();
      }
      assert.deepEqual(errors, []);
      rows.push({ width, lang, status: "PASS", rsvpPosts, attribution: true });
      console.log(width, lang, "PASS");
      await c.close();
    }
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce", storageState }),
    p = await c.newPage();
  await p.goto(origin + "/dev/marketing?lang=uz", { waitUntil: "networkidle" });
  await p.waitForFunction(() => document.querySelector("[data-brand-badge]"));
  assert.equal(await p.locator("[data-brand-badge]").evaluate((e) => getComputedStyle(e).transitionDuration), "0s");
  await c.close();
  rows.push({ reducedMotion: true, status: "PASS" });
  console.log("PASS", rows.length);
} finally {
  await b.close();
  await writeFile(out + "/report.json", JSON.stringify({ origin, rows }, null, 2));
}
