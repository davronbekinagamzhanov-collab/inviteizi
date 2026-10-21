import { arpeggiate, type Hit, type Note, type Score } from "../../blocks/synth";

// Праздничная суннатская: сурнай ведёт мелодию в ладу хиджаз (ре, ми-бемоль, фа-диез…),
// дутор перебирает, дойра держит ритм «дум — так-так — дум — так». 8 тактов по 4 доли.
const chords = [
  ["D3", "F#3", "A3", "D4"],
  ["G3", "Bb3", "D4", "G4"],
  ["C3", "Eb3", "G3", "C4"],
  ["D3", "F#3", "A3", "D4"],
  ["D3", "F#3", "A3", "D4"],
  ["G3", "Bb3", "D4", "G4"],
  ["Eb3", "G3", "Bb3", "Eb4"],
  ["D3", "F#3", "A3", "D4"],
];

// [длительность, нота] подряд — так мелодию легче читать по тактам
const line: [number, string][] = [
  [0.5, "D5"], [0.5, "Eb5"], [1, "F#5"], [0.5, "G5"], [0.5, "F#5"], [1, "Eb5"],
  [1, "D5"], [0.5, "A4"], [0.5, "Bb4"], [2, "A4"],
  [0.5, "G4"], [0.5, "A4"], [0.5, "Bb4"], [0.5, "C5"], [1, "Eb5"], [1, "D5"],
  [3, "D5"], [1, "A4"],
  [1, "A5"], [0.5, "G5"], [0.5, "F#5"], [1, "G5"], [1, "A5"],
  [0.5, "Bb5"], [0.5, "A5"], [1, "G5"], [0.5, "F#5"], [0.5, "G5"], [1, "A5"],
  [0.5, "G5"], [0.5, "F#5"], [1, "Eb5"], [0.5, "D5"], [0.5, "C5"], [1, "Eb5"],
  [2, "D5"], [0.5, "F#5"], [0.5, "Eb5"], [1, "D5"],
];

function sequence(src: [number, string][], vel = 0.8): Note[] {
  let beat = 0;
  return src.map(([len, pitch]) => {
    const n: Note = [beat, pitch, len * 0.92, vel];
    beat += len;
    return n;
  });
}

// Дойра: один такт, повторяется 8 раз
const bar: [number, Hit[1], number][] = [
  [0, "dum", 0.95],
  [1, "tak", 0.6],
  [1.5, "tak", 0.5],
  [2, "dum", 0.8],
  [3, "tak", 0.65],
  [3.5, "zang", 0.5],
];
const doira: Hit[] = Array.from({ length: 8 }, (_, b) =>
  bar.map(([beat, drum, vel]) => [b * 4 + beat, drum, vel] as Hit),
).flat();

export const melody: Score = {
  bpm: 108,
  loopBeats: 32,
  reverb: 0.22,
  tracks: [
    { instrument: "surnay", gain: 0.55, pan: 0.1, notes: sequence(line, 0.75) },
    // дутор подхватывает мелодию октавой ниже — так сурнай звучит мягче
    { instrument: "dutor", gain: 0.5, pan: -0.1, notes: sequence(line, 0.5).map(([b, p, l, v]) => [b, p.replace(/\d/, (o) => String(Number(o) - 1)), l, v]) },
    {
      instrument: "dutor",
      gain: 0.6,
      pan: -0.3,
      notes: arpeggiate(chords, [0, 2, 1, 2, 3, 2, 1, 2], 0.5, { velocity: 0.32 }),
    },
    {
      instrument: "bass",
      gain: 0.7,
      notes: chords.flatMap((c, b) => [
        [b * 4, c[0].replace("3", "2"), 1.5, 0.7] as Note,
        [b * 4 + 2, c[0].replace("3", "2"), 1.5, 0.55] as Note,
      ]),
    },
  ],
  drums: { hits: doira, gain: 0.9 },
};
