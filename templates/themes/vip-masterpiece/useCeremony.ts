"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {useReducedMotion} from "motion/react";
import type {Invitation} from "../../blocks/useInvitation";
/** Loading, gesture, retry and lifecycle only; staging belongs to each design. */
type Asset=string|{src:string;fallback:string};
export function useCeremony(inv:Invitation,assets:readonly Asset[]){
 const key=JSON.stringify(assets),alive=useRef(true),busy=useRef(false),pending=useRef<Promise<void>|null>(null);
 const [ready,setReady]=useState(false),[status,setStatus]=useState<"idle"|"loading"|"error">("idle"),[opening,setOpening]=useState(false),reduced=useReducedMotion();
 const preload=useCallback(()=>{const decode=(src:string)=>{const img=new Image();img.src=src;return img.decode();};return Promise.all([...(JSON.parse(key) as Asset[]).map(asset=>typeof asset==="string"?decode(asset):decode(asset.src).catch(()=>decode(asset.fallback))),document.fonts.ready]).then(()=>undefined);},[key]);
 useEffect(()=>{alive.current=true;pending.current=preload();void pending.current.then(()=>{if(alive.current)setReady(true);}).catch(()=>{});return()=>{alive.current=false;};},[preload]);
 async function open(sequence:()=>Promise<unknown>){
  if(busy.current)return;busy.current=true;inv.start();setStatus("loading");
  try{await(pending.current??preload());}catch{pending.current=null;busy.current=false;if(alive.current)setStatus("error");return;}
  if(!alive.current)return;setReady(true);setStatus("idle");if(reduced){inv.finishOpening();return;}setOpening(true);
  try{await sequence();}catch{ /* Reveal the finished layout if a compositor animation is interrupted. */ }finally{if(alive.current)inv.finishOpening();}
 }
 return{ready,status,opening,open};
}
