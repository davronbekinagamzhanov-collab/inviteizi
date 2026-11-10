"use client";

/* eslint-disable @next/next/no-img-element -- Existing local/client WebP sources, no new image optimization service. */
import {useEffect,useRef} from "react";
import type {VipPhoto} from "./photos";

/** Reconcile cached/error images after hydration, and preserve wide customer photographs on resize. */
export function VipImage({photo,className,eager=false}:{photo:VipPhoto;className?:string;eager?:boolean}){
 const ref=useRef<HTMLImageElement>(null);
 useEffect(()=>{
  const img=ref.current;if(!img)return;
  const reconcile=()=>{
   if(!img.isConnected||!img.complete)return;
   if(!img.naturalWidth){if(img.getAttribute("src")!==photo.fallback)img.src=photo.fallback;return;}
   if(!photo.client)return;
   const frame=img.clientWidth/Math.max(1,img.clientHeight),ratio=img.naturalWidth/Math.max(1,img.naturalHeight);
   img.style.objectFit=Math.max(frame/ratio,ratio/frame)>1.6?"contain":"cover";img.style.objectPosition="50% 50%";
  };
  img.addEventListener("load",reconcile);img.addEventListener("error",reconcile);reconcile();
  const observer=photo.client?new ResizeObserver(reconcile):null;observer?.observe(img);
  return()=>{observer?.disconnect();img.removeEventListener("load",reconcile);img.removeEventListener("error",reconcile);};
 },[photo.src,photo.fallback,photo.client]);
 return <img ref={ref} src={photo.src} data-vip-photo-slot={photo.slot} data-client-photo={photo.client} className={className} alt="" width={1170} height={1755} loading={eager?"eager":"lazy"} fetchPriority={eager&&photo.slot===1?"high":undefined}/>;
}
