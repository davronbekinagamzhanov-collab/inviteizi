/** Разбор ввода клиента */

/** «18:30», «9:05», «18.30» → «ЧЧ:ММ»; неверное («25:99») → null */
export function parseTime(s: string): string | null {
  const m = /^(\d{1,2})[:.](\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

// точные домены (google.evil.com и 2gis.kz.evil.com — не карты)
const MAP_HOSTS = /^(?:[\w-]+\.)*(?:2gis\.(?:kz|ru|com|uz)|goo\.gl|google\.(?:com|kz|ru|uz|co\.uz)|yandex\.(?:ru|kz|uz|com))$/i;

/** Ссылка 2GIS / Google Maps / Яндекс Карт, которую клиент прислал вместо локации */
export function isMapLink(s: string): boolean {
  let url: URL;
  try {
    url = new URL(s.trim());
  } catch {
    return false;
  }
  if (!/^https?:$/.test(url.protocol) || !MAP_HOSTS.test(url.hostname)) return false;
  // google.com — только карты; 2gis и goo.gl — любые ссылки
  if (/google\./i.test(url.hostname) && !/^maps\./i.test(url.hostname)) return url.pathname.startsWith("/maps");
  if (/^goo\.gl$/i.test(url.hostname)) return url.pathname.startsWith("/maps");
  if (/yandex\./i.test(url.hostname)) return url.pathname.startsWith("/maps");
  return true;
}
