import type { Score } from "../../blocks/synth";

/** Запасная мелодия дизайна (если клиент не выбрал песню): медленный дутор, ля минор */
export const melody: Score = {
  bpm: 66,
  loopBeats: 16,
  reverb: 0.35,
  tracks: [
    { instrument: "dutor", gain: 0.55, notes: [[0,"E4",1.5],[1.5,"A4",0.5],[2,"C5",2],[4,"B4",1],[5,"A4",1],[6,"G4",2],[8,"F4",1.5],[9.5,"A4",0.5],[10,"D5",2],[12,"C5",1],[13,"B4",1],[14,"A4",2]] },
    { instrument: "pad", gain: 0.25, notes: [[0,"A2",4],[4,"E2",4],[8,"F2",4],[12,"E2",4]] },
  ],
};
