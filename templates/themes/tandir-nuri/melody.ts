import { arpeggiate, type Hit, type Score } from "../../blocks/synth";

// Тихое утро у тандира: дутор ведёт неспешный напев в ми-фригийском,
// в конце круга — восточная соль-диез (хиджаз) и возвращение в ми.
// Чанг перебирает аккорды, дойра едва слышна. 8 тактов по 4 доли.
const chords = [
  ["E3", "B3", "E4", "G4"],
  ["F3", "A3", "C4", "F4"],
  ["E3", "B3", "E4", "G4"],
  ["D3", "F3", "A3", "D4"],
  ["A2", "E3", "A3", "C4"],
  ["G2", "D3", "G3", "B3"],
  ["F3", "A3", "C4", "F4"],
  ["E3", "G#3", "B3", "E4"],
];

// Дойра: мягкий «дум» на сильную долю, лёгкие «так» и бубенцы в конце такта
const doira: Hit[] = Array.from({ length: 8 }, (_, bar) => {
  const b = bar * 4;
  const hits: Hit[] = [
    [b, "dum", 0.32],
    [b + 2, "tak", 0.14],
    [b + 3, "tak", 0.11],
    [b + 3.5, "zang", 0.09],
  ];
  return hits;
}).flat();

export const melody: Score = {
  bpm: 70,
  loopBeats: 32,
  reverb: 0.4,
  tracks: [
    {
      instrument: "dutor",
      gain: 1,
      pan: 0.1,
      notes: [
        [0, "B4", 1.5], [1.5, "A4", 0.5], [2, "G4", 1], [3, "F4", 1],
        [4, "E4", 1], [5, "F4", 0.5], [5.5, "G4", 0.5], [6, "A4", 2],
        [8, "B4", 1], [9, "C5", 1], [10, "B4", 1], [11, "A4", 1],
        [12, "G4", 1], [13, "F4", 1], [14, "E4", 2],
        [16, "A4", 1], [17, "C5", 1], [18, "E5", 1.5], [19.5, "D5", 0.5],
        [20, "C5", 1], [21, "B4", 1], [22, "D5", 1], [23, "C5", 0.5], [23.5, "B4", 0.5],
        [24, "A4", 1], [25, "G#4", 1], [26, "F4", 1], [27, "G#4", 1],
        [28, "E4", 3.5],
      ],
    },
    {
      // най тихо отвечает во второй половине круга
      instrument: "nay",
      gain: 0.45,
      pan: -0.2,
      notes: [
        [18, "E5", 2, 0.35],
        [22, "D5", 2, 0.3],
        [26, "B4", 2, 0.3],
      ],
    },
    {
      instrument: "chang",
      gain: 0.6,
      pan: -0.25,
      notes: arpeggiate(chords, [0, 2, 1, 3, 2, 1], 0.5, { velocity: 0.24, accent: 0.08 }).filter(
        // в каждом такте оставляем паузу на 4-й доле — перебор «дышит»
        ([beat]) => beat % 4 < 3,
      ),
    },
    { instrument: "pad", gain: 0.35, notes: chords.map((c, bar) => [bar * 4, c[1], 3.9, 0.3] as [number, string, number, number]) },
    {
      instrument: "bass",
      gain: 0.5,
      notes: ["E2", "F2", "E2", "D2", "A1", "G1", "F2", "E2"].map(
        (p, bar) => [bar * 4, p, 3.7, 0.45] as [number, string, number, number],
      ),
    },
  ],
  drums: { hits: doira, gain: 0.7 },
};
