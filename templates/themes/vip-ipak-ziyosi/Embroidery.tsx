"use client";
import {motion,useReducedMotion} from "motion/react";
import s from "./silk.module.css";
// Original continuous double thread, two interlaced loops and small leaf stitches.
const THREAD="M10 47C49 77 79 15 119 39C158 64 190 13 230 37M10 53C50 82 80 21 120 45C159 70 190 19 230 43M119 40C94 5 76 14 91 34C105 51 126 49 124 39C143 5 166 13 149 33C135 50 120 49 119 40M49 48Q31 29 27 39Q34 52 49 48M193 39Q208 20 217 29Q212 43 193 39";
export function SilkStitch({className="",still=false}:{className?:string;still?:boolean}){const reduced=useReducedMotion();return <svg className={`${s.silkStitch} ${className}`} viewBox="0 0 240 86" fill="none" aria-hidden="true"><path d={THREAD} className={s.stitchLight} transform="translate(0 1.1)"/><motion.path d={THREAD} pathLength={1} className={s.stitchInk} initial={{pathLength:still||reduced?1:.2}} whileInView={{pathLength:1}} viewport={{once:true}} transition={{duration:still||reduced?0:1.1,ease:"easeOut"}}/></svg>;}
