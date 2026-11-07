"use client";

/* eslint-disable @next/next/no-img-element -- Existing local/client WebP sources, no new image optimization service. */
import type { VipPhoto } from "./photos";

/** Preserve unusually wide customer photographs instead of cutting off the couple. */
export function VipImage({ photo, className, eager = false }: { photo: VipPhoto; className?: string; eager?: boolean }) {
  return <img
    src={photo.src}
    data-vip-photo-slot={photo.slot}
    data-client-photo={photo.client}
    className={className}
    alt=""
    width={1170}
    height={1755}
    loading={eager ? "eager" : "lazy"}
    fetchPriority={eager && photo.slot === 1 ? "high" : undefined}
    onLoad={event => {
      if (!photo.client) return;
      const img = event.currentTarget;
      const frame = img.clientWidth / Math.max(1, img.clientHeight);
      const ratio = img.naturalWidth / Math.max(1, img.naturalHeight);
      img.style.objectFit = Math.max(frame / ratio, ratio / frame) > 1.6 ? "contain" : "cover";
      img.style.objectPosition = "50% 50%";
    }}
    onError={event => {
      const img = event.currentTarget;
      if (img.getAttribute("src") !== photo.fallback) img.src = photo.fallback;
    }}
  />;
}
