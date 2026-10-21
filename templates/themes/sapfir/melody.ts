import { arpeggiate, type Score } from "../../blocks/synth";

// Вечерняя, бархатная: мягкая подложка и неторопливый дутор в ре-миноре,
// ля-мажор с до-диезом даёт восточный поворот. 8 тактов по 4 доли.
const chords = [
  ["D3", "F3", "A3", "D4"],
  ["Bb2", "D3", "F3", "Bb3"],
  ["G2", "Bb2", "D3", "G3"],
  ["A2", "C#3", "E3", "A3"],
  ["D3", "F3", "A3", "D4"],
  ["Bb2", "D3", "F3", "Bb3"],
  ["G2", "Bb2", "D3", "G3"],
  ["A2", "C#3", "E3", "A3"],
];

const pad = chords.flatMap((c, bar) =>
  c.slice(1).map((p) => [bar * 4, p, 3.8, 0.55] as [number, string, number, number]),
);

export const melody: Score = {
  bpm: 64,
  loopBeats: 32,
  reverb: 0.4,
  tracks: [
    { instrument: "pad", gain: 0.9, notes: pad },
    {
      instrument: "dutor",
      gain: 0.75,
      pan: -0.25,
      notes: arpeggiate(chords, [0, 2, 3, 2], 1, { velocity: 0.35 }),
    },
    {
      instrument: "dutor",
      gain: 1,
      pan: 0.2,
      notes: [
        [0, "A4", 1], [1, "D5", 1.5], [2.5, "C5", 0.5], [3, "A4", 1],
        [4, "Bb4", 1.5], [5.5, "A4", 0.5], [6, "G4", 2],
        [8, "G4", 1], [9, "Bb4", 1], [10, "D5", 1.5], [11.5, "C#5", 0.5],
        [12, "E5", 2], [14, "C#5", 1], [15, "A4", 1],
        [16, "D5", 1.5], [17.5, "E5", 0.5], [18, "F5", 1], [19, "E5", 1],
        [20, "D5", 1], [21, "C5", 1], [22, "Bb4", 2],
        [24, "A4", 1], [25, "G4", 0.5], [25.5, "Bb4", 0.5], [26, "A4", 1], [27, "C#5", 1],
        [28, "D5", 3.5],
      ],
    },
    {
      instrument: "bass",
      gain: 0.6,
      notes: ["D2", "Bb1", "G1", "A1", "D2", "Bb1", "G1", "A1"].map(
        (p, bar) => [bar * 4, p, 3.8, 0.55] as [number, string, number, number],
      ),
    },
  ],
};
