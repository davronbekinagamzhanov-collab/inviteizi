/**
 * Одна система движения для всех приглашений (v2, 05.11.2026).
 * Мягкое замедление в конце, 0,7–1,2 с, лесенка 80–150 мс. Те же значения — CSS-переменные
 * --m-ease / --m-fast / --m-base / --m-slow / --m-step в app/globals.css (для .module.css).
 * Исключения: бесконечные «дыхания» и подсказки (свои длинные циклы) и отклик кнопки на нажатие.
 */
export const MOTION = {
  /** cubic-bezier(0.22, 1, 0.36, 1): быстро стартует, долго и мягко доезжает */
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  /** Короткие появления: подписи, кнопки, исчезновение заставки */
  fast: 0.7,
  /** Обычное появление блока */
  base: 0.9,
  /** Большие движения: конверт, двери, шторка, картина */
  slow: 1.2,
  /** Шаг лесенки между соседними элементами */
  step: 0.1,
} as const;

export const MOTION_CSS_EASE = `cubic-bezier(${MOTION.ease.join(",")})`;

/** Длительность для любого появления — всегда в рамках 0,7–1,2 с */
export function motionDuration(seconds: number) {
  return Math.min(MOTION.slow, Math.max(MOTION.fast, seconds));
}
