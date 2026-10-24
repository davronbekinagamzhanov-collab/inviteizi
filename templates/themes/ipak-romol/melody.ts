import type { Hit, Note, Score } from "../../blocks/synth";

// «Ипак рўмол»: плавный вальсовый шаг (3 доли), лад ҳижоз от соль
// (ля-бемоль и си — увеличенная секунда). Най ведёт мелодию, дутор мягко отвечает
// «раз-два-три», дойра звенит только кольцами. 16 тактов по 3 доли.
const chords: string[][] = [
  ["G2", "B3", "D4"],
  ["G2", "B3", "D4"],
  ["C3", "Eb4", "G4"],
  ["C3", "Eb4", "G4"],
  ["Ab2", "C4", "Eb4"],
  ["F2", "Ab3", "C4"],
  ["G2", "B3", "D4"],
  ["G2", "B3", "D4"],
  ["C3", "Eb4", "G4"],
  ["C3", "Eb4", "G4"],
  ["Ab2", "C4", "Eb4"],
  ["Ab2", "C4", "Eb4"],
  ["F2", "Ab3", "C4"],
  ["C3", "Eb4", "G4"],
  ["G2", "B3", "D4"],
  ["G2", "B3", "D4"],
];

const BAR = 3;

// Дутор: на 2-ю и 3-ю долю — два верхних звука аккорда
const dutor: Note[] = chords.flatMap((c, bar) =>
  [1, 2].flatMap((beat) => [
    [bar * BAR + beat, c[1], 0.9, beat === 1 ? 0.32 : 0.24] as Note,
    [bar * BAR + beat, c[2], 0.9, beat === 1 ? 0.28 : 0.2] as Note,
  ]),
);

const bass: Note[] = chords.map((c, bar) => [bar * BAR, c[0], 2.8, 0.55] as Note);

const pad: Note[] = chords.flatMap((c, bar) =>
  bar % 2 === 0 ? c.slice(1).map((p) => [bar * BAR, p, 5.8, 0.35] as Note) : [],
);

const nay: Note[] = [
  [0, "D5", 2], [2, "Eb5", 1],
  [3, "D5", 1], [4, "C5", 1], [5, "B4", 1],
  [6, "C5", 1.5], [7.5, "D5", 0.5], [8, "Eb5", 1],
  [9, "G5", 2], [11, "F5", 1],
  [12, "Eb5", 1], [13, "F5", 0.5], [13.5, "Eb5", 0.5], [14, "D5", 1],
  [15, "C5", 2], [17, "Ab4", 1],
  [18, "B4", 1.5], [19.5, "C5", 0.5], [20, "B4", 1],
  [21, "G4", 3],
  [24, "G4", 1], [25, "C5", 1], [26, "Eb5", 1],
  [27, "G5", 1.5], [28.5, "Ab5", 0.5], [29, "G5", 1],
  [30, "F5", 1], [31, "Eb5", 1], [32, "C5", 1],
  [33, "Eb5", 2], [35, "D5", 1],
  [36, "C5", 1], [37, "Ab4", 1], [38, "C5", 1],
  [39, "Eb5", 1.5], [40.5, "D5", 0.5], [41, "C5", 1],
  [42, "B4", 1], [43, "Ab4", 0.5], [43.5, "B4", 0.5], [44, "C5", 1],
  [45, "B4", 0.5], [45.5, "Ab4", 0.5], [46, "G4", 2],
];

// Чанг: короткий перебор вверх в начале каждой фразы — как блик на шёлке
const chang: Note[] = [0, 24].flatMap((start) =>
  ["G4", "B4", "D5", "G5"].map((p, i) => [start + i * 0.25, p, 1.2, 0.3] as Note),
);

// Дойра: только звон колец, лёгкий «дум» в начале каждых двух тактов
const hits: Hit[] = chords.flatMap((_, bar) => [
  [bar * BAR, bar % 2 === 0 ? "dum" : "zang", bar % 2 === 0 ? 0.3 : 0.2] as Hit,
  [bar * BAR + 1, "zang", 0.14] as Hit,
  [bar * BAR + 2, "zang", 0.12] as Hit,
]);

export const melody: Score = {
  bpm: 84,
  loopBeats: chords.length * BAR,
  reverb: 0.38,
  tracks: [
    { instrument: "pad", gain: 0.7, notes: pad },
    { instrument: "bass", gain: 0.55, notes: bass },
    { instrument: "dutor", gain: 0.7, pan: -0.25, notes: dutor },
    { instrument: "nay", gain: 0.85, pan: 0.15, notes: nay },
    { instrument: "chang", gain: 0.6, pan: 0.3, notes: chang },
  ],
  drums: { hits, gain: 0.5 },
};
