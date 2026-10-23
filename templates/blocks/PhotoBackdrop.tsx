import Image from "next/image";
import type { CSSProperties } from "react";

/**
 * Мягкое фото-фон, как в эталоне sunnat-toy: фото слегка размыто и плавно растворяется
 * в цвет дизайна, текст поверх читается легко.
 *
 * Размытие (2–6px) уже «запечено» в файл скриптом `scripts/pixabay.mjs pick` — так телефону
 * не нужно размывать картинку на лету. Здесь только растворение и прозрачность.
 *
 * fade:
 *  - "to-top"    — фото внизу, кверху тает в цвет (текст сверху);
 *  - "to-bottom" — фото вверху, книзу тает в цвет (текст снизу);
 *  - "both"      — фото посередине, тает и вверх, и вниз;
 *  - "radial"    — фото в центре, тает к краям (медальон без рамки).
 */
export function PhotoBackdrop({
  src,
  alt = "",
  color,
  fade = "to-top",
  opacity = 1,
  strength = 0.55,
  position = "50% 50%",
  priority = false,
  className = "absolute inset-0",
}: {
  src: string;
  alt?: string;
  /** Цвет, в который тает фото (обычно --c-paper дизайна) */
  color: string;
  fade?: "to-top" | "to-bottom" | "both" | "radial";
  /** Прозрачность самого фото, 0..1 */
  opacity?: number;
  /** Какая доля высоты уходит на растворение, 0..1 */
  strength?: number;
  /** object-position фото */
  position?: string;
  /** Первая картина экрана: грузится сразу */
  priority?: boolean;
  className?: string;
}) {
  const s = Math.round(strength * 100);
  const mask: Record<typeof fade, string> = {
    "to-top": `linear-gradient(to top, #000 ${100 - s}%, transparent 100%)`,
    "to-bottom": `linear-gradient(to bottom, #000 ${100 - s}%, transparent 100%)`,
    both: `linear-gradient(to bottom, transparent 0%, #000 ${s / 2}%, #000 ${100 - s / 2}%, transparent 100%)`,
    radial: `radial-gradient(ellipse 70% 60% at 50% 50%, #000 ${100 - s}%, transparent 100%)`,
  };
  const maskStyle: CSSProperties = { maskImage: mask[fade], WebkitMaskImage: mask[fade] };

  return (
    <div aria-hidden data-decor className={`pointer-events-none overflow-hidden ${className}`} style={{ backgroundColor: color }}>
      <div className="absolute inset-0" style={{ ...maskStyle, opacity }}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 430px) 100vw, 430px"
          className="object-cover"
          style={{ objectPosition: position }}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
        />
      </div>
    </div>
  );
}
