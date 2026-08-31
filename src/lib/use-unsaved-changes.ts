"use client";
import {useEffect} from "react";
export function useUnsavedChanges(dirty:boolean){useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(!dirty)return;event.preventDefault();event.returnValue=""};window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn)},[dirty])}
