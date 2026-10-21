import type { InvitationEvent } from "./types";

/**
 * Ссылка для кнопки «Харитада очиш». Порядок важен:
 * 1. Точные координаты (клиент отправил локацию в Telegram) — главный вариант.
 *    2GIS ставит метку ровно в эту точку; на телефоне ссылку перехватывает приложение 2GIS.
 * 2. Ссылка 2GIS / Google Maps, которую прислал клиент.
 * 3. Запасной: поиск по названию и адресу в 2GIS.
 */
export function mapLink(ev: Pick<InvitationEvent, "location" | "mapUrl" | "venueName" | "address">) {
  if (ev.location && isValidCoords(ev.location)) {
    const { lat, lng } = ev.location;
    // 2GIS ждёт «долгота,широта»
    return `https://2gis.kz/geo/${lng.toFixed(6)},${lat.toFixed(6)}`;
  }
  if (ev.mapUrl && /^https?:\/\//i.test(ev.mapUrl)) return ev.mapUrl;

  const query = `${ev.venueName.replace(/[«»"]/g, "")} ${ev.address}`;
  return `https://2gis.kz/shymkent/search/${encodeURIComponent(query)}`;
}

function isValidCoords({ lat, lng }: { lat: number; lng: number }) {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
  );
}
