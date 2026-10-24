import { arpeggiate, type Hit, type Note, type Score } from "../../blocks/synth";

// «Шкатулка с музыкой»: звонкий чанг ведёт мелодию в ля-миноре с узбекским вводным соль-диезом
// (как в праздничных ялла), най отвечает мягко, дутор перебирает, дойра — лёгкий «дум-так-так».
// 8 тактов по 4 доли, при повторе не утомляет: вторая половина отвечает первой.
const chords = [
  ["A2", "E3", "A3", "C4"],
  ["D3", "F3", "A3", "D4"],
  ["G2", "D3", "G3", "B3"],
  ["A2", "E3", "A3", "C4"],
  ["F2", "C3", "F3", "A3"],
  ["D3", "F3", "A3", "D4"],
  ["E2", "B2", "E3", "G#3"],
  ["A2", "E3", "A3", "C4"],
];

// [длительность, нота] подряд — мелодию легче читать по тактам
const line: [number, string][] = [
  [0.5, "E5"], [0.5, "A5"], [0.5, "G#5"], [0.5, "A5"], [1, "B5"], [1, "A5"],
  [0.5, "F5"], [0.5, "E5"], [0.5, "D5"], [0.5, "E5"], [2, "F5"],
  [0.5, "D5"], [0.5, "G5"], [0.5, "F5"], [0.5, "E5"], [1, "D5"], [1, "B4"],
  [1.5, "C5"], [0.5, "B4"], [2, "A4"],
  [0.5, "C5"], [0.5, "D5"], [1, "E5"], [0.5, "F5"], [0.5, "E5"], [1, "C5"],
  [0.5, "D5"], [0.5, "E5"], [1, "F5"], [0.5, "A5"], [0.5, "G5"], [1, "F5"],
  [0.5, "E5"], [0.5, "F5"], [0.5, "E5"], [0.5, "D5"], [1, "C5"], [1, "B4"],
  [3, "A4"], [1, "E5"],
];

function sequence(src: [number, string][], vel = 0.8): Note[] {
  let beat = 0;
  return src.map(([len, pitch]) => {
    const n: Note = [beat, pitch, len * 0.9, vel];
    beat += len;
    return n;
  });
}

// Дойра: один такт, повторяется 8 раз; в последней доле — бубенцы
const bar: [number, Hit[1], number][] = [
  [0, "dum", 0.85],
  [1, "tak", 0.45],
  [1.5, "tak", 0.35],
  [2, "dum", 0.6],
  [3, "tak", 0.5],
  [3.5, "zang", 0.4],
];
const doira: Hit[] = Array.from({ length: 8 }, (_, b) =>
  bar.map(([beat, drum, vel]) => [b * 4 + beat, drum, vel] as Hit),
).flat();

// Най вступает только во второй половине — ответ на фразу чанга (октавой ниже, длинными нотами)
const nay: Note[] = [
  [16, "C5", 1.8, 0.4], [18, "E5", 1.8, 0.4],
  [20, "D5", 1.8, 0.4], [22, "F5", 1.8, 0.4],
  [24, "E5", 3.6, 0.4], [28, "A4", 3.6, 0.35],
];

export const melody: Score = {
  bpm: 100,
  loopBeats: 32,
  reverb: 0.3,
  tracks: [
    { instrument: "chang", gain: 0.6, pan: 0.15, notes: sequence(line, 0.75) },
    { instrument: "bell", gain: 0.18, pan: 0.3, notes: sequence(line, 0.5).filter((_, i) => i % 3 === 0) },
    { instrument: "nay", gain: 0.32, pan: -0.15, notes: nay },
    {
      instrument: "dutor",
      gain: 0.5,
      pan: -0.3,
      notes: arpeggiate(chords, [0, 2, 1, 3, 2, 1, 3, 2], 0.5, { velocity: 0.3 }),
    },
    {
      instrument: "bass",
      gain: 0.6,
      notes: chords.flatMap((c, b) => [
        [b * 4, c[0], 1.6, 0.65] as Note,
        [b * 4 + 2.5, c[1], 1.2, 0.45] as Note,
      ]),
    },
  ],
  drums: { hits: doira, gain: 0.7 },
};
