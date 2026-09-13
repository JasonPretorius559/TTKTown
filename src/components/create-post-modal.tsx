"use client";

import Image from "next/image";
import { Film, ChevronDown, Grid2X2, ImagePlus, Search, Store, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { VideoUploader, publishVideo, type SelectedVideo } from "@/components/video-uploader";
import { ImageUploader, type UploadedImage } from "@/components/image-uploader";
import { createRecord, useFirestoreCollection } from "@/lib/firestore-data";
import type { Figure, Listing } from "@/types";

type User = { uid:string; username:string; displayName:string; avatar?:string };
type Mode = "video" | "photo" | "figure" | "listing" | null;

export function CreatePostModal({ open, onClose, user, initialMode=null }: { open:boolean; onClose:()=>void; user:User; initialMode?:Mode }) {
  const dialogRef=useRef<HTMLDivElement>(null); const textareaRef=useRef<HTMLTextAreaElement>(null);
  const [video,setVideo]=useState<SelectedVideo|null>(null); const [videoProgress,setVideoProgress]=useState("");
  const [caption,setCaption]=useState(""); const [images,setImages]=useState<UploadedImage[]>([]); const [mode,setMode]=useState<Mode>(initialMode);
  const [figureId,setFigureId]=useState(""); const [listingId,setListingId]=useState(""); const [search,setSearch]=useState(""); const [saving,setSaving]=useState(false); const [error,setError]=useState("");
  const figuresState=useFirestoreCollection<Figure>(open?"figures":"",{orderBy:["name","asc"],limit:100});
  const listingsState=useFirestoreCollection<Listing>(open?"listings":"",{where:[["sellerId","==",user.uid]],limit:50});
  const figures=useMemo(()=>figuresState.data.filter(f=>!search||[f.name,f.character,f.franchise].some(v=>v?.toLowerCase().includes(search.toLowerCase()))),[figuresState.data,search]);
  useEffect(()=>{if(open){document.body.style.overflow="hidden";setTimeout(()=>textareaRef.current?.focus(),20)}else document.body.style.overflow="";return()=>{document.body.style.overflow=""}},[open]);
  useEffect(()=>{if(!open)return;const key=(event:KeyboardEvent)=>{if(event.key==="Escape"&&!saving)onClose();if(event.key==="Tab"&&dialogRef.current){const focusable=Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]),textarea,input,select,a[href]'));if(!focusable.length)return;const first=focusable[0],last=focusable[focusable.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}};document.addEventListener("keydown",key);return()=>document.removeEventListener("keydown",key)},[onClose,open,saving]);
  if(!open)return null;
  const reset=()=>{setCaption("");setImages([]);setVideo(null);setFigureId("");setListingId("");setMode(null);setError("")};
  const close=()=>{if(saving)return;reset();onClose()};
  const publish=async()=>{if(saving||(!caption.trim()&&!images.length&&!figureId&&!listingId&&!video))return;setSaving(true);setError("");try{if(video){await publishVideo(video,caption.trim(),figureId,setVideoProgress)}else await createRecord("posts",{authorId:user.uid,author:user.username,displayName:user.displayName,avatar:user.avatar||"/tinkertown-mark.svg",caption:caption.trim(),image:images[0]?.url||"",images:images.map(i=>i.url),imagePathnames:images.map(i=>i.pathname),figureId:figureId||null,listingId:listingId||null,audience:"PUBLIC",likes:0,comments:0});reset();onClose()}catch(reason){setError(reason instanceof Error?reason.message:"Post failed. Try again.")}finally{setSaving(false)}};
  return <div className="post-modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)close()}}><div className="post-modal" role="dialog" aria-modal="true" aria-labelledby="create-post-title" ref={dialogRef}>
    <header className="post-modal-head"><button className="icon-btn" onClick={close} disabled={saving} aria-label="Close create post"><X size={19}/></button><h2 id="create-post-title">{mode==="video"?"Share a Short":"Create Post"}</h2><span/></header>
    <div className={`post-modal-content${saving?" is-saving":""}`} inert={saving}><div className="post-author"><Image className="avatar" src={user.avatar||"/tinkertown-mark.svg"} alt="" width={44} height={44}/><div><strong>{user.displayName}</strong><button type="button">Public <ChevronDown size={13}/></button></div></div>
    <textarea ref={textareaRef} value={caption} disabled={saving} onChange={e=>setCaption(e.target.value)} maxLength={2000} placeholder={mode==="video"?"Tell collectors what they’re seeing (optional)":"What’s new on your shelf?"} aria-label="Post text"/>
    {mode==="video"&&<><VideoUploader value={video} onChange={setVideo}/><details className="short-context"><summary><Grid2X2 size={17}/><span><strong>Tag the figure</strong><small>Optional · connects this Short to its catalogue page</small></span></summary><div className="attachment-picker"><label className="search-inline"><Search size={16}/><input className="field" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search catalogue figures…"/></label><div className="attachment-results">{figures.slice(0,8).map(f=><button className={figureId===f.id?"selected":""} key={f.id} onClick={()=>setFigureId(f.id)}><Image src={f.image} alt="" width={42} height={42}/><span><strong>{f.name}</strong><small>{f.franchise}</small></span></button>)}</div></div></details></>}
    {mode==="photo"&&<ImageUploader value={images} onChange={setImages} maxImages={6}/>} 
    {mode==="figure"&&<div className="attachment-picker"><label className="search-inline"><Search size={16}/><input className="field" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search catalogue figures…"/></label><div className="attachment-results">{figures.slice(0,8).map(f=><button className={figureId===f.id?"selected":""} key={f.id} onClick={()=>setFigureId(f.id)}><Image src={f.image} alt="" width={42} height={42}/><span><strong>{f.name}</strong><small>{f.franchise}</small></span></button>)}</div></div>}
    {mode==="listing"&&<div className="attachment-picker"><div className="attachment-results">{listingsState.data.filter(l=>l.status==="ACTIVE").map(l=><button className={listingId===l.id?"selected":""} key={l.id} onClick={()=>setListingId(l.id)}><Image src={l.image} alt="" width={42} height={42}/><span><strong>{l.title}</strong><small>Your active listing</small></span></button>)}{!listingsState.loading&&!listingsState.data.some(l=>l.status==="ACTIVE")&&<p>You don’t have an active listing yet.</p>}</div></div>}
    {(figureId||listingId)&&<div className="selected-attachment"><Grid2X2 size={16}/>{figureId?figuresState.data.find(f=>f.id===figureId)?.name:listingsState.data.find(l=>l.id===listingId)?.title}<button onClick={()=>{setFigureId("");setListingId("")}} aria-label="Remove attachment"><X size={15}/></button></div>}
    {error&&<div className="form-alert" role="alert">{error}</div>}
    <div className="post-attach-row"><strong>Add to your post</strong><button className={mode==="photo"?"active":""} disabled={saving||Boolean(video)} onClick={()=>setMode(mode==="photo"?null:"photo")} aria-label="Add photos"><ImagePlus size={20}/></button><button className={mode==="figure"?"active":""} disabled={saving||Boolean(video)} onClick={()=>setMode(mode==="figure"?null:"figure")} aria-label="Attach figure"><Grid2X2 size={20}/></button><button className={mode==="listing"?"active":""} disabled={saving||Boolean(video)} onClick={()=>setMode(mode==="listing"?null:"listing")} aria-label="Attach listing"><Store size={20}/></button><button disabled={saving||images.length>0||Boolean(figureId||listingId)} className={mode==="video"?"active":""} aria-label="Add short video" onClick={()=>setMode("video")}><Film size={20}/></button></div>
    </div><footer className="post-modal-footer"><span aria-live="polite">{saving&&video?videoProgress:`${caption.length}/2,000`}</span><button className="btn btn-primary" onClick={publish} disabled={saving||(!caption.trim()&&!images.length&&!figureId&&!listingId&&!video)}>{saving?"Posting…":mode==="video"?"Share short":"Post"}</button></footer>
  </div></div>;
}
