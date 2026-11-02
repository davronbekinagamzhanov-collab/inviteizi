import type { Score } from "../../blocks/synth";

/** Запасная мелодия дизайна (если клиент не выбрал песню): тихий чанг, ре мажор */
export const melody: Score = {
  bpm: 72,
  loopBeats: 16,
  reverb: 0.35,
  tracks: [
    { instrument: "chang", gain: 0.55, notes: [[0,"F#4",1],[1,"A4",1],[2,"D5",2],[4,"C#5",1],[5,"B4",1],[6,"A4",2],[8,"G4",1],[9,"B4",1],[10,"E5",2],[12,"D5",1],[13,"C#5",1],[14,"D5",2]] },
    { instrument: "pad", gain: 0.25, notes: [[0,"D3",4],[4,"A2",4],[8,"G2",4],[12,"A2",4]] },
  ],
};
