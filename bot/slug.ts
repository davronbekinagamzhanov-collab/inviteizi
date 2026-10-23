/**
 * ВРЕМЕННО: транслит имён в slug, пока БЭКЕНД не положил lib/slug.ts с тем же контрактом
 * (`slugify(...names: string[]): string`). Когда появится — заменить импорт в bot/flow на "@/lib/slug"
 * и удалить этот файл.
 */
const MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "x", ц: "ts", ч: "ch", ш: "sh", щ: "sh", ъ: "", ы: "i", ь: "", э: "e", ю: "yu", я: "ya",
  ў: "o", қ: "q", ғ: "g", ҳ: "h", "'": "", "’": "", "ʼ": "", "‘": "", "`": "",
};

export function slugify(...names: string[]): string {
  const raw = names
    .join(" ")
    .toLowerCase()
    .split("")
    .map((ch) => (ch in MAP ? MAP[ch] : ch))
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const cut = raw.slice(0, 40).replace(/-+$/g, "");
  return cut || "taklif";
}
