"use client";
import type {TemplateProps} from "../types";
import {FloralPolish} from "../floral-polish/Design";
import {melody} from "../muhr/melody";
export default function Design(props:TemplateProps){return <FloralPolish {...props} id="gul-doira" melody={melody}/>;}
