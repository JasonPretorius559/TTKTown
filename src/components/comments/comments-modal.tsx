"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { CommentThread } from "@/components/comments/comment-thread";
import { useFirestoreDocument } from "@/lib/firestore-data";
import type { Post } from "@/types";

export function CommentsModal({postId,count,onClose}:{postId:string;count:number;onClose:()=>void}){
  const dialogRef=useRef<HTMLDivElement>(null);const postState=useFirestoreDocument<Post>(`posts/${postId}`);const liveCount=postState.data?.comments??count;
  useEffect(()=>{document.body.style.overflow="hidden";const key=(event:KeyboardEvent)=>{if(event.key==="Escape")onClose();if(event.key==="Tab"&&dialogRef.current){const items=Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]),textarea,select,a[href]'));const first=items[0],last=items[items.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}}};document.addEventListener("keydown",key);return()=>{document.body.style.overflow="";document.removeEventListener("keydown",key)}},[onClose]);
  return <div className="comments-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}><section className="comments-modal" role="dialog" aria-modal="true" aria-labelledby="comments-title" ref={dialogRef}><header><div><h2 id="comments-title">Comments</h2><span>{liveCount} in this conversation</span></div><button onClick={onClose} aria-label="Close comments"><X size={20}/></button></header><CommentThread postId={postId}/></section></div>;
}
