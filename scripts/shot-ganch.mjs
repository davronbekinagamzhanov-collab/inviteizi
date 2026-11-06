// Снимки «Ганч пештоқ» для сравнения до/после: обложка (закрыта), после открытия, вся страница. node scripts/shot-ganch.mjs <папка>
import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
const dir = process.argv[2];
await mkdir(dir, { recursive: true });
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
await page.goto("http://localhost:3121/demo/ganch-peshtoq", { waitUntil: "load" });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${dir}/1-cover.png` });
await page.mouse.click(187, 450);
await page.waitForTimeout(3500);
await page.screenshot({ path: `${dir}/2-opened.png` });
await page.screenshot({ path: `${dir}/3-full.png`, fullPage: true });
await browser.close();
