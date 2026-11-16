/**
 * Цена со скидкой (акция, промокод, оптовик): округление вниз до числа, оканчивающегося на 90
 * (2 990 −50 % → 1 490; 4 990 −50 % → 2 490; 7 990 −20 % → 6 390), 100 % — 0 ₸. Общая для сервера и интерфейса.
 * Целочисленно: base·(100 − %) — сумма в сотых долях тенге.
 */
export const discounted = (base: number, percent: number) => {
  if (percent >= 100) return 0;
  const hundredths = base * (100 - Math.max(0, percent));
  return hundredths < 9_000 ? 0 : Math.floor((hundredths - 9_000) / 10_000) * 100 + 90;
};
