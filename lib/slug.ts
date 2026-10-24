/**
 * Адрес пригласительного: имена → латиница (aziz-madina).
 * Занятость (aziz-madina-2) проверяет Repo.createOrder / isSlugTaken.
 */

const MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "x", ц: "ts", ч: "ch", ш: "sh", щ: "sh", ъ: "", ы: "i", ь: "", э: "e", ю: "yu", я: "ya",
  ў: "o", қ: "q", ғ: "g", ҳ: "h",
};

/** Апострофы и похожие знаки (Ma'mura, O‘g‘iloy, Маъмура) — просто убираются */
const APOSTROPHES = /['’‘ʼʻ`´]/g;

const MAX = 40;

/** Адреса, которые заняты страницами сайта (/demo, /catalog, /api…) — совпадает с check в таблице orders */
export const RESERVED_SLUGS = new Set([
  "demo", "catalog", "api", "admin", "art", "covers", "music", "pilots", "previews", "dev",
  "namuna", "bot", "cron", "webhook", "static", "assets", "public", "robots", "sitemap", "favicon",
  "help", "about", "privacy", "terms", "login", "www",
]);

export function isReservedSlug(slug: string) {
  return RESERVED_SLUGS.has(slug);
}

/** Тот же формат, что у check в базе: a-z, 0-9, одиночные дефисы внутри, до 60 знаков */
export function isValidSlug(slug: string) {
  return slug.length <= 60 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && !isReservedSlug(slug);
}

export function slugify(...names: string[]): string {
  const latin = [...names.join(" ").toLowerCase().replace(APOSTROPHES, "")]
    .map((ch) => MAP[ch] ?? ch)
    .join("")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "");
  let slug = latin
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX)
    .replace(/-+$/, "");
  if (!slug) slug = "taklif";
  if (isReservedSlug(slug)) slug = `${slug}-toy`;
  return slug;
}
