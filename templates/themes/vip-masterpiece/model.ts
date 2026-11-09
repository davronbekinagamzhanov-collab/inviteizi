import type {InvitationData} from "@/lib/types";
import type {Invitation} from "../../blocks/useInvitation";
import type {VipPhoto} from "../vip-tilla-muhr/photos";
import {slugify} from "@/lib/slug";
export const masterpieceIds=["vip-ipak-ziyosi","vip-zarbof"] as const;
export type MasterpieceId=typeof masterpieceIds[number];
export function photos(data:Pick<InvitationData,"photos">,id:MasterpieceId):VipPhoto[]{return [1,2,3].map(slot=>{const fallback=id==="vip-ipak-ziyosi"?`/vip/${id}/ceremony-${slot}.webp`:`/vip/${id}/${slot}.webp`;const own=id==="vip-ipak-ziyosi"?data.photos?.[slot-1]:undefined;return {src:own||fallback,fallback,client:Boolean(own),slot:slot as 1|2|3};});}
export function initials(data:Pick<InvitationData,"groom"|"bride">){return [data.groom,data.bride].map(name=>name?.trim()?slugify(name).replace(/[^a-z]/g,"").charAt(0).toUpperCase():"");}
export function reception(inv:Pick<Invitation,"program"|"main">){return inv.program.find(ev=>ev.kind==="nikohBazm")??inv.main;}
