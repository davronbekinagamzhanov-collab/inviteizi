// Генерирует временную мелодию «музыкальная шкатулка» для проверки демо.
// Запуск: node scripts/make-placeholder-music.mjs
// Настоящие мелодии владелец подберёт сам (только с правом использования).
import { writeFileSync, mkdirSync } from "node:fs";

const RATE = 22050;
const BPM = 84;
const beat = 60 / BPM;

// Частота ноты по номеру MIDI
const hz = (m) => 440 * 2 ** ((m - 69) / 12);

// Мелодия: [нота MIDI, длительность в долях]
const A = 69, C = 72, D = 74, E = 76, G = 79, A5 = 81, B = 71, F = 77;
const melody = [
  [E, 1], [A5, 1], [G, 0.5], [E, 0.5], [D, 1], [E, 1], [C, 2],
  [D, 1], [E, 1], [G, 0.5], [E, 0.5], [D, 1], [C, 1], [B, 2],
  [E, 1], [A5, 1], [G, 0.5], [A5, 0.5], [B + 12, 1], [A5, 1], [G, 2],
  [F, 1], [E, 1], [D, 0.5], [C, 0.5], [B, 1], [C, 0.5], [B, 0.5], [A, 2],
];
// Бас: по одной ноте на такт (4 доли)
const bass = [45, 41, 48, 43, 45, 41, 40, 45];

const totalBeats = melody.reduce((s, [, d]) => s + d, 0);
const length = Math.ceil((totalBeats * beat + 1.5) * RATE);
const buf = new Float32Array(length);

function bell(startSec, freq, durSec, gain) {
  const start = Math.floor(startSec * RATE);
  const n = Math.floor((durSec + 1.2) * RATE);
  for (let i = 0; i < n && start + i < length; i++) {
    const t = i / RATE;
    const env = Math.exp(-t * 3.2) * Math.min(1, t * 400);
    const s =
      Math.sin(2 * Math.PI * freq * t) +
      0.35 * Math.sin(2 * Math.PI * freq * 2 * t) * Math.exp(-t * 4) +
      0.12 * Math.sin(2 * Math.PI * freq * 3.01 * t) * Math.exp(-t * 6);
    buf[start + i] += s * env * gain;
  }
}

let time = 0.2;
for (const [note, dur] of melody) {
  bell(time, hz(note), dur * beat, 0.32);
  time += dur * beat;
}
bass.forEach((note, i) => bell(0.2 + i * 4 * beat, hz(note), 4 * beat, 0.22));

// Нормализация и мягкое затухание в конце
let peak = 0;
for (const v of buf) peak = Math.max(peak, Math.abs(v));
const fade = RATE * 1.2;
const pcm = Buffer.alloc(44 + length * 2);
for (let i = 0; i < length; i++) {
  const f = i > length - fade ? (length - i) / fade : 1;
  pcm.writeInt16LE(Math.round((buf[i] / peak) * 0.8 * f * 32767), 44 + i * 2);
}

// Заголовок WAV
pcm.write("RIFF", 0);
pcm.writeUInt32LE(36 + length * 2, 4);
pcm.write("WAVEfmt ", 8);
pcm.writeUInt32LE(16, 16);
pcm.writeUInt16LE(1, 20);
pcm.writeUInt16LE(1, 22);
pcm.writeUInt32LE(RATE, 24);
pcm.writeUInt32LE(RATE * 2, 28);
pcm.writeUInt16LE(2, 32);
pcm.writeUInt16LE(16, 34);
pcm.write("data", 36);
pcm.writeUInt32LE(length * 2, 40);

mkdirSync("public/music", { recursive: true });
writeFileSync("public/music/namuna-kuy.wav", pcm);
console.log(`Готово: public/music/namuna-kuy.wav (${(pcm.length / 1024).toFixed(0)} КБ, ${(length / RATE).toFixed(1)} с)`);
