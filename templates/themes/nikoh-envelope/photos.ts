import type {InvitationData} from "@/lib/types";
import type {Shot} from "../natural/common";
/** Three replaceable slots; unfilled slots keep the coherent generated wedding series. */
export function weddingShots(data:InvitationData,kind:"muhr"|"ipak"):Shot[]{
 return [1,2,3].map((slot,i)=>({src:data.photos?.[i]||`/art/nikoh-envelope/${kind}-${slot}.webp`,client:Boolean(data.photos?.[i])}));
}
