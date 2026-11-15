import type {ReactNode} from "react";
export type Blocks={masthead:ReactNode;hero:ReactNode;letter:ReactNode;calendar:ReactNode;program:ReactNode;places:ReactNode;countdown:ReactNode};
export function BotanicalGate(b:Blocks){return <>{b.hero}{b.letter}{b.program}{b.calendar}{b.places}{b.countdown}</>;}
export function FloralCircle(b:Blocks){return <>{b.hero}{b.letter}{b.calendar}{b.countdown}{b.program}{b.places}</>;}
export function BlueEditorial(b:Blocks){return <>{b.hero}{b.letter}{b.program}{b.calendar}{b.places}</>;}
export function EmeraldGazette(b:Blocks){return <>{b.masthead}{b.calendar}{b.letter}{b.hero}{b.places}{b.program}</>;}
export function BlushLetter(b:Blocks){return <>{b.hero}{b.letter}{b.places}{b.program}{b.calendar}</>;}
export const compositions={"girih-barg":BotanicalGate,"gul-doira":FloralCircle,"suvbuyoq-tuman":BlueEditorial,"suvbuyoq-zumrad":EmeraldGazette,"suvbuyoq-upa":BlushLetter};
