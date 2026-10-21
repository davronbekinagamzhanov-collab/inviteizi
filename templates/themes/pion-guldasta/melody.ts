import { arpeggiate, type Hit, type Note, type Score } from "../../blocks/synth";

// Торжественная юбилейная: чанг ведёт мелодию в соль-миноре с ре-мажором (фа-диез),
// в конце — светлый соль-мажор. Подложка, бас и тихие бубенцы дойры. 8 тактов по 4 доли.
const chords = [
  ["G3", "Bb3", "D4", "G4"],
  ["C3", "Eb3", "G3", "C4"],
  ["D3", "F#3", "A3", "D4"],
  ["G3", "Bb3", "D4", "G4"],
  ["Eb3", "G3", "Bb3", "Eb4"],
  ["C3", "Eb3", "G3", "C4"],
  ["D3", "F#3", "A3", "D4"],
  ["G3", "B3", "D4", "G4"],
];

const lead: [number, string][] = [
  [1, "D5"], [1, "G5"], [0.5, "F#5"], [0.5, "G5"], [1, "A5"],
  [1.5, "Bb5"], [0.5, "A5"], [2, "G5"],
  [1, "A5"], [1, "F#5"], [1, "D5"], [0.5, "Eb5"], [0.5, "D5"],
  [2, "D5"], [1, "Bb4"], [1, "D5"],
  [1, "G5"], [1, "Bb5"], [0.5, "A5"], [0.5, "G5"], [1, "F5"],
  [1.5, "Eb5"], [0.5, "D5"], [1, "C5"], [1, "Eb5"],
  [1, "D5"], [0.5, "C5"], [0.5, "Bb4"], [1, "A4"], [1, "F#4"],
  [4, "G4"],
];

function sequence(src: [number, string][], vel: number): Note[] {
  let beat = 0;
  return src.map(([len, pitch]) => {
    const n: Note = [beat, pitch, len, vel];
    beat += len;
    return n;
  });
}

const bells: Hit[] = Array.from({ length: 8 }, (_, b) => [
  [b * 4 + 1, "zang", 0.35] as Hit,
  [b * 4 + 3, "zang", 0.4] as Hit,
]).flat();

export const melody: Score = {
  bpm: 84,
  loopBeats: 32,
  reverb: 0.38,
  tracks: [
    { instrument: "chang", gain: 1.1, pan: 0.15, notes: sequence(lead, 0.75) },
    {
      instrument: "pad",
      gain: 0.9,
      notes: chords.flatMap((c, b) => c.slice(1).map((p) => [b * 4, p, 3.8, 0.5] as Note)),
    },
    {
      instrument: "dutor",
      gain: 0.55,
      pan: -0.3,
      notes: arpeggiate(chords, [0, 1, 2, 1], 1, { velocity: 0.3 }),
    },
    {
      instrument: "bass",
      gain: 0.65,
      notes: chords.map((c, b) => [b * 4, c[0].replace("3", "2"), 3.6, 0.6] as Note),
    },
  ],
  drums: { hits: bells, gain: 0.6 },
};
