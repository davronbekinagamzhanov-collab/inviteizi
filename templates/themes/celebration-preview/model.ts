import type {Invitation} from "../../blocks/useInvitation";

export const celebrationIds=["sahar-sabosi","subhi-safo"] as const;
export type CelebrationId=typeof celebrationIds[number];
export const artOf=(id:CelebrationId)=>`/art/celebrations/${id}-hero.webp`;
export function mainEvent(inv:Invitation){
 return inv.events.find(e=>e.kind==="nahorgi")??inv.main;
}
