/**
 * Данные одного пригласительного. Позже это будет строка в таблице orders (Supabase).
 * Шаблон получает только эти данные и ничего не знает о базе.
 */
export type InvitationData = {
  groom: string; // Азиз
  bride: string; // Мадина
  hosts: string; // Каримовлар оиласи
  date: string; // "2026-11-14" (ГГГГ-ММ-ДД)
  time: string; // "18:00"
  venueName: string; // «Наврўз» тўйхонаси
  address: string; // Сайрам, Ибрагимов кўчаси 12
  location?: { lat: number; lng: number }; // точка, которую клиент отправил в Telegram
  mapUrl?: string; // ссылка 2GIS / Google Maps, если клиент прислал ссылку вместо точки
  inviteTextId?: string; // какой вариант текста выбран
  musicUrl?: string; // файл мелодии; нет — значит без музыки
};

/** demo — с водяным знаком «НАМУНА» и без музыки (до оплаты); full — полная версия */
export type InvitationMode = "demo" | "full";
