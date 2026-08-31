"use client";

import Image from "next/image";
import { Send } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";

export function CommentComposer({onSubmit,replyingTo,autoFocus=false,onCancel}:{onSubmit:(content:string)=>Promise<void>;replyingTo?:string;autoFocus?:boolean;onCancel?:()=>void}){
  const {user}=useAuth();const [text,setText]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  const send=async()=>{const content=text.trim();if(!content||busy)return;setBusy(true);setError("");try{await onSubmit(content);setText("")}catch(reason){setError(reason instanceof Error?reason.message:"Could not post comment. Try again.")}finally{setBusy(false)}};
  return <div className={replyingTo?"reply-composer":"comment-composer"}>{replyingTo&&<div className="replying-label">Replying to @{replyingTo}</div>}<div className="comment-compose-row"><Image className="avatar" src={user?.avatar||"/tinkertown-mark.svg"} alt="" width={34} height={34}/><label><span className="sr-only">{replyingTo?"Write a reply":"Write a comment"}</span><textarea autoFocus={autoFocus} value={text} onChange={event=>setText(event.target.value)} maxLength={1500} placeholder={replyingTo?"Write a reply…":"Write a comment…"}/><small>{text.length}/1,500</small></label>{onCancel&&<button className="btn btn-ghost btn-small" onClick={onCancel}>Cancel</button>}<button className="comment-send" disabled={busy||!text.trim()} onClick={send} aria-label={busy?"Posting comment":"Post comment"}><Send size={16}/>{replyingTo&&<span>{busy?"Replying…":"Reply"}</span>}</button></div>{error&&<div className="comment-error" role="alert">{error} <button onClick={send}>Retry</button></div>}</div>;
}
