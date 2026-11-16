/** Цена со скидкой: кратна 100 ₸ (вниз), 100 % — 0 ₸. Общая для сервера и интерфейса */
export const discounted = (base: number, percent: number) =>
  percent >= 100 ? 0 : Math.max(0, Math.floor((base * (100 - percent)) / 10000) * 100);
