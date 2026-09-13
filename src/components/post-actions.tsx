"use client";
import { auth } from "@/lib/firebase";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bookmark, Check, Copy, Flag, Link2, MessageCircle, MoreHorizontal, Pencil, Send, Share2, Trash2, X } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast-provider";
import { removeRecord, updateRecord, useFirestoreDocument } from "@/lib/firestore-data";
import { reportReasons, savePost, submitReport, type ReportReason } from "@/lib/post-actions";
import type { Post, SavedPost } from "@/types";

const reasonLabels:Record<ReportReason,string>={SPAM:"Spam",SCAM:"Scam",HARASSMENT:"Harassment",HATE_ABUSIVE:"Hate or abusive content",INAPPROPRIATE:"Inappropriate content",COUNTERFEIT:"Counterfeit item",MISLEADING:"Misleading information",OTHER:"Other"};

function postUrl(postId:string){return typeof window==="undefined"?`/posts/${postId}`:`${window.location.origin}/posts/${postId}`}

function useDismiss(open:boolean,close:()=>void){
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(!open)return;const pointer=(event:MouseEvent)=>{if(!ref.current?.contains(event.target as Node))close()};const key=(event:KeyboardEvent)=>{if(event.key==="Escape")close()};document.addEventListener("mousedown",pointer);document.addEventListener("keydown",key);return()=>{document.removeEventListener("mousedown",pointer);document.removeEventListener("keydown",key)}},[close,open]);
  return ref;
}

export function PostShareMenu({post}:{post:Post}){
  const [open,setOpen]=useState(false);const toast=useToast();const ref=useDismiss(open,()=>setOpen(false));
  const copy=async()=>{try{await navigator.clipboard.writeText(postUrl(post.id));toast("Link copied");setOpen(false)}catch{toast("Could not copy the link")}};
  const share=async()=>{try{if(navigator.share)await navigator.share({title:"TinkerTown post",text:post.caption||`Post by @${post.author}`,url:postUrl(post.id)});else await copy();setOpen(false)}catch(reason){if(reason instanceof DOMException&&reason.name==="AbortError")return;toast("Could not share this post")}};
  return <div className="post-action-wrap" ref={ref}><button aria-label="Share post" aria-expanded={open} onClick={()=>setOpen(value=>!value)}><Share2 size={19}/></button>{open&&<div className="post-action-menu share-menu" role="menu"><button role="menuitem" onClick={copy}><Copy/>Copy link</button><button role="menuitem" onClick={share}><Send/>Share post</button><Link role="menuitem" href={`/messages?share=${encodeURIComponent(`/posts/${post.id}`)}`} onClick={()=>setOpen(false)}><MessageCircle/>Send in message</Link></div>}</div>;
}

export function PostSaveButton({postId}:{postId:string}){
  const {user}=useAuth();const router=useRouter();const toast=useToast();const savedState=useFirestoreDocument<SavedPost>(user?`users/${user.uid}/savedPosts/${postId}`:null);const [optimistic,setOptimistic]=useState<boolean|null>(null);const [busy,setBusy]=useState(false);const saved=optimistic??Boolean(savedState.data);
  const toggle=async()=>{if(!user){router.push("/login");return}if(busy)return;const next=!saved;setBusy(true);setOptimistic(next);try{if(next)await savePost(user.uid,postId);else await removeRecord(`users/${user.uid}/savedPosts/${postId}`);toast(next?"Post saved":"Removed from saved");window.setTimeout(()=>setOptimistic(null),350)}catch{setOptimistic(saved);toast("Could not update saved posts")}finally{setBusy(false)}};
  return <button className={`save-post${saved?" saved":""}`} aria-label={saved?"Remove from saved posts":"Save post"} aria-pressed={saved} disabled={busy} onClick={toggle}><Bookmark size={19} fill={saved?"currentColor":"none"}/></button>;
}

function ActionDialog({title,description,onClose,children}:{title:string;description?:string;onClose:()=>void;children:React.ReactNode}){
  useEffect(()=>{const key=(event:KeyboardEvent)=>{if(event.key==="Escape")onClose()};document.addEventListener("keydown",key);const previous=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{document.removeEventListener("keydown",key);document.body.style.overflow=previous}},[onClose]);
  return <div className="post-action-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}><section className="post-action-dialog" role="dialog" aria-modal="true" aria-labelledby="post-action-title"><header><div><h2 id="post-action-title">{title}</h2>{description&&<p>{description}</p>}</div><button aria-label="Close" onClick={onClose}><X/></button></header>{children}</section></div>;
}

export function PostOverflowMenu({post,onVisibilityChange}:{post:Post;onVisibilityChange?:(hidden:boolean)=>void}){
  const {user}=useAuth();const router=useRouter();const toast=useToast();const [open,setOpen]=useState(false);const [dialog,setDialog]=useState<"edit"|"delete"|"report"|null>(null);const [caption,setCaption]=useState(post.caption||"");const [reason,setReason]=useState<ReportReason>("SPAM");const [details,setDetails]=useState("");const [busy,setBusy]=useState(false);const ref=useDismiss(open,()=>setOpen(false));const owner=Boolean(user&&post.authorId===user.uid);
  const copy=async()=>{try{await navigator.clipboard.writeText(postUrl(post.id));toast("Link copied")}catch{toast("Could not copy the link")}setOpen(false)};
  const launch=(next:typeof dialog)=>{setOpen(false);setDialog(next)};
  const edit=async()=>{const value=caption.trim();if(!value||busy)return;setBusy(true);try{await updateRecord(`posts/${post.id}`,{caption:value});toast("Post updated");setDialog(null)}catch{toast("Could not update the post")}finally{setBusy(false)}};
  const remove=async()=>{if(busy)return;setBusy(true);onVisibilityChange?.(true);try{if(post.mediaType==="VIDEO"){const token=await auth?.currentUser?.getIdToken();const response=await fetch(`/api/media/videos/${post.id}`,{method:"DELETE",headers:{Authorization:`Bearer ${token}`}});if(!response.ok)throw new Error("Delete failed")}else await removeRecord(`posts/${post.id}`);toast("Post deleted");setDialog(null)}catch{onVisibilityChange?.(false);toast("Could not delete the post")}finally{setBusy(false)}};
  const hide=()=>{onVisibilityChange?.(true);setOpen(false);toast("Post hidden")};
  const report=async()=>{if(!user){router.push("/login");return}if(busy)return;setBusy(true);try{await submitReport({reporterId:user.uid,targetType:"POST",targetId:post.id,reason,details});toast("Report submitted for review");setDialog(null);setDetails("")}catch(error){toast(error instanceof Error?error.message:"Could not submit the report")}finally{setBusy(false)}};
  return <><div className="post-action-wrap post-overflow" ref={ref}><button className="post-more" aria-label="More post options" aria-expanded={open} onClick={()=>setOpen(value=>!value)}><MoreHorizontal size={20}/></button>{open&&<div className="post-action-menu" role="menu">{owner?<>{post.mediaType!=="VIDEO"&&<button role="menuitem" onClick={()=>launch("edit")}><Pencil/>Edit post</button>}<button role="menuitem" onClick={copy}><Link2/>Copy link</button><span className="menu-divider"/><button className="danger" role="menuitem" onClick={()=>launch("delete")}><Trash2/>Delete post</button></>:<><PostMenuSave postId={post.id} close={()=>setOpen(false)}/><button role="menuitem" onClick={copy}><Link2/>Copy link</button><span className="menu-divider"/><button role="menuitem" onClick={()=>launch("report")}><Flag/>Report post</button><button role="menuitem" onClick={hide}><X/>Hide post</button></>}</div>}</div>
  {dialog==="edit"&&<ActionDialog title="Edit post" description="Update the caption. Photos and attachments stay as they are." onClose={()=>setDialog(null)}><div className="post-dialog-body"><textarea className="field" value={caption} maxLength={2200} onChange={event=>setCaption(event.target.value)} autoFocus/><small>{caption.length}/2200</small></div><footer><button className="btn btn-ghost" onClick={()=>setDialog(null)}>Cancel</button><button className="btn btn-primary" disabled={busy||!caption.trim()} onClick={edit}>{busy?"Saving…":"Save changes"}</button></footer></ActionDialog>}
  {dialog==="delete"&&<ActionDialog title="Delete this post?" description="This removes the post from TinkerTown." onClose={()=>setDialog(null)}><div className="post-delete-note"><Trash2/><p>This action can’t be undone.</p></div><footer><button className="btn btn-ghost" onClick={()=>setDialog(null)}>Keep post</button><button className="btn btn-danger" disabled={busy} onClick={remove}>{busy?"Deleting…":"Delete post"}</button></footer></ActionDialog>}
  {dialog==="report"&&<ActionDialog title="Report post" description="Tell us what’s wrong. The author won’t be told who reported it." onClose={()=>setDialog(null)}><div className="post-dialog-body report-reasons">{reportReasons.map(item=><label key={item}><input type="radio" name="report-reason" checked={reason===item} onChange={()=>setReason(item)}/><span>{reasonLabels[item]}</span>{reason===item&&<Check/>}</label>)}<textarea className="field" value={details} maxLength={500} onChange={event=>setDetails(event.target.value)} placeholder={reason==="OTHER"?"Tell us what happened (required)":"Add details (optional)"}/></div><footer><button className="btn btn-ghost" onClick={()=>setDialog(null)}>Cancel</button><button className="btn btn-primary" disabled={busy||(reason==="OTHER"&&!details.trim())} onClick={report}>{busy?"Submitting…":"Submit report"}</button></footer></ActionDialog>}</>;
}

function PostMenuSave({postId,close}:{postId:string;close:()=>void}){
  const {user}=useAuth();const router=useRouter();const toast=useToast();const saved=useFirestoreDocument<SavedPost>(user?`users/${user.uid}/savedPosts/${postId}`:null).data;const [busy,setBusy]=useState(false);
  const act=async()=>{if(!user){router.push("/login");return}if(busy)return;setBusy(true);try{if(saved)await removeRecord(`users/${user.uid}/savedPosts/${postId}`);else await savePost(user.uid,postId);toast(saved?"Removed from saved":"Post saved");close()}catch{toast("Could not update saved posts")}finally{setBusy(false)}};
  return <button role="menuitem" disabled={busy} onClick={act}><Bookmark fill={saved?"currentColor":"none"}/>{saved?"Remove from saved":"Save post"}</button>;
}
