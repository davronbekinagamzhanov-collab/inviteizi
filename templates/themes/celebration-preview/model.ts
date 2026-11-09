import type {Invitation} from "../../blocks/useInvitation";

export const celebrationIds=["sahar-sabosi","subhi-safo","mehr-fasli","qutlug-nihol"] as const;
export type CelebrationId=typeof celebrationIds[number];
export const artOf=(id:CelebrationId)=>`/art/celebrations/${id}.svg`;
export function mainEvent(inv:Invitation){
 const kind=inv.occasion==="nahorgi"?"nahorgi":inv.occasion==="sunnat"?"sunnatBazm":"yubileyBazm";
 return inv.events.find(e=>e.kind===kind)??inv.main;
}
