// Загрузчики кода дизайнов — отдельно от реестра (templates/registry.ts — только данные).
// Источник: templates/design-modules.ts (карта id → import()). Из неё генерируется
// templates/design-loaders.tsx — next/dynamic с буквальным import() для страниц приглашений,
// чтобы страница получала CSS и шрифты только открытого дизайна, а не всех.
// Добавили дизайн → строка в DESIGN_MODULES → node scripts/gen-design-loaders.mjs. Тест сверяет с реестром.
import { readFileSync, writeFileSync } from "node:fs";

export function loaderEntries() {
  const src = readFileSync("templates/design-modules.ts", "utf8");
  const block = (name) =>
    src.slice(src.indexOf(`export const ${name}`), src.indexOf("};", src.indexOf(`export const ${name}`)));
  const read = (name) =>
    new Map([...block(name).matchAll(/"?([a-z0-9-]+)"?:\s*\(\)\s*=>\s*import\("([^"]+)"\)/g)].map((m) => [m[1], m[2]]));
  return { entries: read("DESIGN_MODULES"), legacy: read("LEGACY_MODULES") };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { entries, legacy } = loaderEntries();
  const line = ([id, p]) => `  "${id}": dynamic(() => import("${p}")),`;
  const out = `"use client";
// СГЕНЕРИРОВАНО scripts/gen-design-loaders.mjs из templates/design-modules.ts — не править руками.
// next/dynamic с буквальным import(): на странице приглашения — CSS и шрифты только открытого дизайна.
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { TemplateProps } from "./themes/types";

const DESIGN_VIEWS: Record<string, ComponentType<TemplateProps>> = {
${[...entries].map(line).join("\n")}
};

/** Прежние версии переработанных дизайнов для старых оплаченных заказов */
const LEGACY_VIEWS: Record<string, ComponentType<TemplateProps>> = {
${[...legacy].map(line).join("\n")}
};

/** Дизайн по id; legacy — прежняя версия для старого оплаченного заказа */
export function DesignView({ id, legacy = false, ...props }: TemplateProps & { id: string; legacy?: boolean }) {
  const View = (legacy ? LEGACY_VIEWS[id] : undefined) ?? DESIGN_VIEWS[id];
  return <View {...props} />;
}
`;
  writeFileSync("templates/design-loaders.tsx", out);
  console.log(`designs: ${entries.size}, legacy: ${legacy.size}`);
}
