"use client";
import type {TemplateProps} from "../types";
import {useInvitation} from "../../blocks/useInvitation";
import {B3Shell,Names,Pic,palette} from "../b3/kit";
import {t} from "@/texts/uz-cyrl";
import {melody} from "../oq-ot/melody";
import {melody as textileMelody} from "../oltin-monogramma/melody";
import s from "./card.module.css";
const defaults=["/art/suzani-medalyon/1.webp","/art/suzani-medalyon/2.webp","/art/suzani-medalyon/3.webp"];
export function WeddingCard({data,mode,textile=false}:TemplateProps&{textile?:boolean}){
 const inv=useInvitation(data,mode,{opening:false,melody:textile?textileMelody:melody,initialLanguage:"uz"});
 const photos={list:textile?defaults.map((src,i)=>({src:data.photos?.[i]||src,client:Boolean(data.photos?.[i])})):[],credits:[]};
 const ink=textile?"#58332f":"#293c34",accent=textile?"#9b6150":"#657b65",paper=textile?"#efe4d4":"#ebe9df";
 const skin={vars:palette({paper,ink,accent,soft:"#e5ded0",line:"#c8b69b",card:"#fffaf0"}),pageColor:paper,backdrop:"bg-[#e6e2d8]",music:"",rsvp:{paper:"#fffaf0",ink,line:"#c8b69b",soft:paper,accent,radius:"8px",buttonRadius:"50%"}};
 return <B3Shell inv={inv} skin={skin} look={{page:s.page}} credits={photos.credits}><article data-simple-card className={`${s.card} ${textile?s.textile:s.paper}`}>
  {textile&&<div className={s.medallion}><Pic shot={photos.list[0]} eager/></div>}
  <header data-short-names={textile&&((data.groom?.length??0)+(data.bride?.length??0)<=16)||undefined}><p className={s.kicker}>{t.occasionTitles.nikoh}</p><Names inv={inv} className={s.names}/></header>
  <div className={s.message}>{inv.text.greeting&&<h2>{inv.text.greeting}</h2>}<p>{inv.text.body}</p></div>
  <ol className={s.events}>{inv.program.map((e,i)=><li data-card-event key={i}><div className={s.when}><span>{inv.program.length>1?e.title:t.date.title.nikoh}</span><time dateTime={`${e.date}T${e.time}`}>{t.date.long(e.when.day,e.when.monthIndex,e.when.year)}<b>{e.time}</b></time></div><div className={s.place}><div><h3>{e.venueName}</h3><p>{e.address}</p></div><a className={s.map} href={e.mapHref} target="_blank" rel="noopener noreferrer" aria-label={`${t.venue.openMap}: ${e.venueName}`}><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7m0 10a3 3 0 1 1 0-6 3 3 0 0 1 0 6"/></svg></a></div></li>)}</ol>
  <footer><span>{t.hosts.respect}</span><p>{data.hosts}</p>{inv.sides&&<p>{t.sides.groom}: {inv.sides.groom}<br/>{t.sides.bride}: {inv.sides.bride}</p>}</footer>
  {textile&&<div className={s.keepsakes}>{photos.list.slice(1).map((photo,i)=><Pic key={i} shot={photo}/>)}</div>}
 </article></B3Shell>;
}
