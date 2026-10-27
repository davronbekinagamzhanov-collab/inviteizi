/** Owner-supplied places. URLs/addresses are preserved verbatim; no inferred coordinates. */
export const VENUES = [
  {id:"saltanat",name:"Saltanat",address:"Юсуфа Сареми, 3/1",mapUrl:"https://go.2gis.com/ew6G4"},
  {id:"nayryz",name:"Nayryz",address:"Ибрагим Ата, 174",mapUrl:"https://go.2gis.com/JReZD"},
  {id:"aq-niet",name:"Ақ Ниет",address:"Ибрагим Ата, 123",mapUrl:"https://go.2gis.com/lnTA6"},
  {id:"nur",name:"Nur",address:"Сатыбалдиева Сайдакбар, 30/8",mapUrl:"https://go.2gis.com/vpRv9"},
  {id:"aq-tilek",name:"AQ Tilek",address:"Ибрагим Ата, 41/2",mapUrl:"https://go.2gis.com/z0z43"},
  {id:"gulruh",name:"Гулрух",address:"Ибрагим Ата, 187",mapUrl:"https://go.2gis.com/GJoAF"},
  {id:"shinar",name:"Shinar",address:"Жалиля, 4/1",mapUrl:"https://go.2gis.com/catip"},
  {id:"didar",name:"Didar",address:"Исраилова, 76/1",mapUrl:"https://go.2gis.com/eFcoe"},
  {id:"shahrizoda",name:"Шахризода",address:"Елебекова, 139",mapUrl:"https://go.2gis.com/yWw5R"},
  {id:"dostar",name:"Достар",address:"Ибрагим Ата, 378Б",mapUrl:"https://go.2gis.com/xDjrK"},
] as const;

/** Optional future picker must stay inside the existing HTTPS application. No identity in its URL. */
export function venuePickerUrl(value:string|undefined,base:string):string|undefined {
  if(!value)return undefined;
  try{const u=new URL(value),b=new URL(base);return u.protocol==="https:"&&u.origin===b.origin&&!u.username&&!u.password&&!u.search&&!u.hash?u.href:undefined;}catch{return undefined;}
}
