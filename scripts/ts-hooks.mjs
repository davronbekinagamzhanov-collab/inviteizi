// Позволяет скриптам node импортировать .ts проекта: алиас «@/» и импорты без расширения.
// Node 24 сам убирает типы из .ts (type stripping). JSX (.tsx) так не загрузить — скриптам он не нужен.
// Использование: import "./ts-hooks.mjs"; затем await import("../templates/registry.ts")
import { registerHooks } from "node:module";
import { statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const isFile = (p) => {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
};

function find(base) {
  const hit = [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")].find(isFile);
  return hit ? pathToFileURL(hit).href : null;
}

/** Файлы проекта .ts — это ES-модули (в package.json нет "type": "module") */
const asModule = (r) =>
  r.url.endsWith(".ts")
    ? { ...r, format: "module-typescript", shortCircuit: true }
    : r.url.endsWith(".json")
      ? { ...r, format: "json", shortCircuit: true, importAttributes: { type: "json" } }
      : { ...r, shortCircuit: true };

registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("@/")) {
      const url = find(path.join(root, specifier.slice(2)));
      if (url) return asModule({ url });
    }
    const relative = specifier.startsWith("./") || specifier.startsWith("../");
    if (relative && !path.extname(specifier) && context.parentURL?.startsWith("file:")) {
      const parent = fileURLToPath(context.parentURL);
      if (/\.tsx?$/.test(parent)) {
        const url = find(path.resolve(path.dirname(parent), specifier));
        if (url) return asModule({ url });
      }
    }
    return asModule(next(specifier, context));
  },
});
