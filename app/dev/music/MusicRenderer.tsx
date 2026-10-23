"use client";

import { useEffect } from "react";
import { renderOffline, type Score } from "@/templates/blocks/synth";
import { melody as oltinMonogramma } from "@/templates/themes/oltin-monogramma/melody";
import { melody as sapfir } from "@/templates/themes/sapfir/melody";
import { melody as oqOt } from "@/templates/themes/oq-ot/melody";
import { melody as tonggiQozon } from "@/templates/themes/tonggi-qozon/melody";
import { melody as pionGuldasta } from "@/templates/themes/pion-guldasta/melody";

const scores: Record<string, Score> = {
  "oltin-monogramma": oltinMonogramma,
  sapfir,
  "oq-ot": oqOt,
  "tonggi-qozon": tonggiQozon,
  "pion-guldasta": pionGuldasta,
};

/** 16-битный PCM стерео, base64 — забирает scripts/render-music.mjs и кодирует в MP3 */
async function render(id: string, seconds: number) {
  const buf = await renderOffline(scores[id], seconds);
  const [l, r] = [buf.getChannelData(0), buf.getChannelData(1)];
  const toInt = (x: number) => Math.max(-32768, Math.min(32767, Math.round(x * 32767)));
  const left = new Int16Array(l.length);
  const right = new Int16Array(r.length);
  for (let i = 0; i < l.length; i++) {
    left[i] = toInt(l[i]);
    right[i] = toInt(r[i]);
  }
  const b64 = (a: Int16Array) => {
    const bytes = new Uint8Array(a.buffer);
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
  };
  return { sampleRate: buf.sampleRate, left: b64(left), right: b64(right) };
}

export function MusicRenderer() {
  useEffect(() => {
    (window as unknown as { __renderMusic: typeof render; __musicIds: string[] }).__renderMusic = render;
    (window as unknown as { __musicIds: string[] }).__musicIds = Object.keys(scores);
  }, []);
  return <p data-ready>music renderer</p>;
}
