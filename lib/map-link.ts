import type { InvitationData } from "./types";

/**
 * Ссылка для кнопки «Харитада очиш». Порядок важен:
 * 1. Точные координаты из заказа (клиент отправил локацию в Telegram) — главный вариант.
 *    Google Maps ставит метку ровно в эту точку и на телефоне открывается в приложении карт.
 * 2. Ссылка 2GIS / Google Maps, которую прислал клиент.
 * 3. Запасной: поиск по названию тойханы и адресу в 2GIS.
 */
export function mapLink(data: Pick<InvitationData, "location" | "mapUrl" | "venueName" | "address">) {
  if (data.location && isValidCoords(data.location)) {
    const { lat, lng } = data.location;
    return `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lng.toFixed(6)}`;
  }
  if (data.mapUrl && /^https?:\/\//i.test(data.mapUrl)) return data.mapUrl;

  const query = `${data.venueName.replace(/[«»"]/g, "")} ${data.address}`;
  return `https://2gis.kz/shymkent/search/${encodeURIComponent(query)}`;
}

function isValidCoords({ lat, lng }: { lat: number; lng: number }) {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
  );
}
