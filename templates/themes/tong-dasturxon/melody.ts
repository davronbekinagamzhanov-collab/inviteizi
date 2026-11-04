import type { Score } from "../../blocks/synth";

/** Запасная мелодия дизайна (если клиент не выбрал песню): утренний най, фа мажор */
export const melody: Score = {
  bpm: 60,
  loopBeats: 16,
  reverb: 0.35,
  tracks: [
    { instrument: "nay", gain: 0.55, notes: [[0,"C5",2],[2,"A4",1],[3,"G4",1],[4,"F4",3],[8,"G4",1],[9,"A4",1],[10,"C5",2],[12,"Bb4",2],[14,"A4",2]] },
    { instrument: "pad", gain: 0.25, notes: [[0,"F2",4],[4,"C3",4],[8,"Bb2",4],[12,"C3",4]] },
  ],
};
