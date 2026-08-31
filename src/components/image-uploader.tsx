"use client";

import Image from "next/image";
import { ImagePlus, Trash2 } from "lucide-react";
import React from "react";
import { upload } from "@vercel/blob/client";
import { auth } from "@/lib/firebase";

export type UploadedImage = { pathname:string; url:string; contentType:string };

export function ImageUploader({ value, onChange, maxImages = 8 }: {
  value:UploadedImage[]; onChange:(images:UploadedImage[])=>void; maxImages?:number;
}) {
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState("");

  const choose = async (event:React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    setError("");
    if (!auth?.currentUser) { setError("Sign in before uploading images."); return; }
    if (value.length + selected.length > maxImages) { setError(`Maximum ${maxImages} images per item.`); return; }
    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
    const invalid = selected.find(file => !allowed.has(file.type) || file.size > 2 * 1024 * 1024);
    if (invalid) { setError(`${invalid.name} must be JPEG, PNG, or WebP and no larger than 2 MB.`); return; }

    setBusy(true); setProgress(0);
    try {
      const token = await auth.currentUser.getIdToken();
      const uploaded:UploadedImage[] = [];
      for (let index=0; index<selected.length; index++) {
        const file = selected[index];
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const blob = await upload(`images/${auth.currentUser.uid}/${crypto.randomUUID()}-${safeName}`, file, {
          access:"private", handleUploadUrl:"/api/blob/upload",
          headers:{ Authorization:`Bearer ${token}` }, contentType:file.type,
          onUploadProgress:event => setProgress(Math.round(((index + event.percentage / 100) / selected.length) * 100))
        });
        uploaded.push({ pathname:blob.pathname, contentType:blob.contentType, url:`/api/blob?pathname=${encodeURIComponent(blob.pathname)}` });
      }
      onChange([...value, ...uploaded]);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Upload failed"); }
    finally { setBusy(false); setProgress(0); }
  };

  return <div className="form-stack" aria-busy={busy}>
    <label className="empty" style={{border:"2px dashed var(--line)",padding:25,cursor:"pointer"}}>
      <ImagePlus size={32}/><strong role="status" aria-live="polite">{busy?`Uploading ${progress}%`:`Add images (${value.length}/${maxImages})`}</strong>
      <p>JPEG, PNG, or WebP · maximum 2&nbsp;MB each</p>
      <input name="images" className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple={maxImages>1} disabled={busy||value.length>=maxImages} onChange={choose}/>
    </label>
    {error&&<div className="demo-note" role="alert">{error}</div>}
    {value.length>0&&<div className="shelf-grid">{value.map((item,index)=><div className="card" style={{position:"relative",overflow:"hidden"}} key={item.pathname}><Image src={item.url} alt={`Upload ${index+1}`} width={300} height={300} style={{width:"100%",height:160,objectFit:"cover"}}/><button type="button" className="heart-btn" aria-label={`Remove image ${index+1}`} onClick={()=>onChange(value.filter(image=>image.pathname!==item.pathname))}><Trash2 size={17}/></button></div>)}</div>}
  </div>;
}
