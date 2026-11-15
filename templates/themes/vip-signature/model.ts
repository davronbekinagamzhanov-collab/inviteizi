import type {InvitationData} from "@/lib/types";
import type {Invitation} from "../../blocks/useInvitation";
import type {VipPhoto} from "../vip-tilla-muhr/photos";

export const signatureIds=["vip-visol-nuri","vip-zarrin-ahd"] as const;
export type SignatureId=typeof signatureIds[number];
export const signature={
  "vip-visol-nuri":{kind:"cinema",paper:"#f8f4ee",ink:"#484033",accent:"#9d8058",soft:"#e9dfd1",material:"silk"},
  "vip-zarrin-ahd":{kind:"royal",paper:"#f5eee1",ink:"#562b29",accent:"#a98959",soft:"#e4d7c5",material:"paper"},
} as const;
export function signaturePhotos(data:Pick<InvitationData,"photos">,id:SignatureId):[VipPhoto,VipPhoto,VipPhoto]{
  return [1,2,3].map(slot=>{
    const fallback=`/vip/${id}/${slot}.webp`,src=data.photos?.[slot-1];
    return {src:src||fallback,fallback,client:Boolean(src),slot};
  }) as [VipPhoto,VipPhoto,VipPhoto];
}
/** Put the actual wedding reception at the first point of orientation, without altering order data. */
export function weddingEvent(inv:Pick<Invitation,"program"|"main">){
  return inv.program.find(event=>event.kind==="nikohBazm")??inv.main;
}
