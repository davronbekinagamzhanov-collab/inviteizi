"use client";
import {useSyncExternalStore} from "react";
const query="(prefers-reduced-motion: reduce)";
function subscribe(notify:()=>void){const media=window.matchMedia(query);media.addEventListener("change",notify);return()=>media.removeEventListener("change",notify);}
function snapshot(){return window.matchMedia(query).matches;}
function serverSnapshot(){return false;}
/** Keep SSR and the first hydration render identical, then honor the live preference. */
export function useMotionPreference(){return useSyncExternalStore(subscribe,snapshot,serverSnapshot);}
