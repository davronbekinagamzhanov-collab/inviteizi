"use client";
import { useLayoutEffect, useState, type RefObject } from "react";

/**
 * Цвета плашек InviteIZI берутся только из палитры самого дизайна.
 * Источники по порядку: переменные натуральных дизайнов (--n-*), общие переменные дизайна (--c-*),
 * фактический фон под плашкой и цвет текста дизайна рядом с ней. Чужих цветов нет.
 * Текст — тот цвет палитры, у которого лучший контраст с фоном (цель ≥ 4,5).
 */
export type BrandTone = { ink: string; paper: string; accent: string };

type Rgba = [number, number, number, number];

function parse(color: string): Rgba | null {
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b, a = "1"] = m[1].split(/[\s,/]+/).filter(Boolean);
    return [Number(r), Number(g), Number(b), Number(a)];
  }
  const h = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!h) return null;
  const x = h[1].length === 3 ? [...h[1]].map((c) => c + c).join("") : h[1];
  return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16), 1];
}

const lum = ([r, g, b]: Rgba) => {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

export function contrast(a: Rgba, b: Rgba) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const css = ([r, g, b]: Rgba) => `rgb(${r}, ${g}, ${b})`;

/** Первый непрозрачный фон от элемента вверх; иначе цвет страницы (pageColor дизайна) */
function backgroundBehind(el: Element): Rgba | null {
  for (let n: Element | null = el; n; n = n.parentElement) {
    const c = parse(getComputedStyle(n).backgroundColor);
    if (c && c[3] > 0.6) return c;
  }
  return parse(getComputedStyle(document.documentElement).backgroundColor);
}

/** Цвет обычного текста дизайна рядом с плашкой (последний видимый текст перед ней) */
function nearbyText(el: Element): Rgba | null {
  let n: Element | null = el.previousElementSibling;
  while (n) {
    const all = [...n.querySelectorAll("p, h1, h2, h3, span")].reverse();
    for (const x of all) {
      if (!x.textContent?.trim() || x.closest("[aria-hidden='true']")) continue;
      const c = parse(getComputedStyle(x).color);
      if (c && c[3] > 0.6) return c;
    }
    n = n.previousElementSibling;
  }
  return null;
}

export function pickTone(el: Element): BrandTone | null {
  const s = getComputedStyle(el);
  const v = (name: string) => parse(s.getPropertyValue(name));
  const bg = backgroundBehind(el);
  const paper = v("--n-paper") ?? v("--c-paper") ?? bg;
  if (!paper) return null;
  const behind = bg ?? paper;
  const inks = [v("--n-ink"), v("--c-ink"), nearbyText(el), v("--c-primary-dark"), v("--c-primary"), v("--c-paper")];
  const candidates = inks.filter((c): c is Rgba => Boolean(c));
  if (!candidates.length) return null;
  // Первый цвет палитры с контрастом ≥ 4,5 к фону, иначе самый контрастный из палитры
  const ink =
    candidates.find((c) => contrast(c, behind) >= 4.5 && contrast(c, paper) >= 4.5) ??
    [...candidates].sort((a, b) => contrast(b, behind) - contrast(a, behind))[0];
  const accents = [v("--n-accent"), v("--c-accent"), v("--c-gold")].filter((c): c is Rgba => Boolean(c));
  const accent = accents.find((c) => contrast(c, paper) >= 3) ?? ink;
  return { ink: css(ink), paper: css(paper), accent: css(accent) };
}

/** Тон для плашки: считается после показа приглашения (язык выбран, страница открыта) */
export function useBrandTone(ref: RefObject<Element | null>, deps: unknown[] = []) {
  const [tone, setTone] = useState<BrandTone | null>(null);
  useLayoutEffect(() => {
    if (ref.current) setTone(pickTone(ref.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- пересчёт по смене состояния страницы
  }, deps);
  return tone;
}
