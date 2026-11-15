"use client";

import { Fragment, useLayoutEffect, useRef } from "react";

/**
 * Подгоняет кегль так, чтобы самое широкое слово внутри контейнера помещалось целиком
 * (слова никогда не рвутся посреди). Кегль ставится в CSS-переменную --fit
 * на контейнере, дети пишут font-size: var(--fit). Меряем по-настоящему, после загрузки шрифта.
 */
export function useFitWords<T extends HTMLElement>(max: number) {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let last = -1;
    const fit = () => {
      el.style.setProperty("--fit", `${max}px`);
      // A theme may cap --fit with min(...). Scale from the rendered size,
      // otherwise a capped heading can stay too wide after our first pass.
      const renderedSize = parseFloat(getComputedStyle(el).fontSize);
      const scale = el.getBoundingClientRect().width / Math.max(1, el.offsetWidth);
      const width = el.clientWidth - 1;
      let widest = 0;
      el.querySelectorAll<HTMLElement>("[data-word]").forEach((w) => {
        // Block-level words report the container width; measure their text.
        // Normalize the reveal transform so opening motion cannot shrink it.
        const range = document.createRange();
        range.selectNodeContents(w);
        widest = Math.max(widest, range.getBoundingClientRect().width / (scale || 1));
      });
      const size = widest > width && widest > 0 ? Math.floor(((renderedSize * width) / widest) * 10) / 10 - 0.2 : max;
      el.style.setProperty("--fit", `${size}px`);
      last = el.clientWidth;
    };
    fit();
    void document.fonts.ready.then(fit);
    // пересчитываем только при смене ширины (высота меняется от самого кегля)
    const ro = new ResizeObserver(() => {
      if (el.clientWidth !== last) fit();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [max]);

  return ref;
}

/** Текст, разбитый на неразрывные слова: их ширину меряет useFitWords */
export function Words({ text }: { text: string }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <>
      {words.map((w, i) => (
        <Fragment key={i}>
          {i > 0 && " "}
          <span data-word className="inline-block whitespace-nowrap">
            {w}
          </span>
        </Fragment>
      ))}
    </>
  );
}
