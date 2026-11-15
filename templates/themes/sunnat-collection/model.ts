import type {Invitation} from "../../blocks/useInvitation";
export function mainEvent(inv:Invitation){return inv.events.find(e=>e.kind==="sunnatBazm")??inv.main;}
