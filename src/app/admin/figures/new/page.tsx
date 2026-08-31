"use client";

import Link from "next/link";
import Image from "next/image";
import { use, useState } from "react";
import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { ImageUploader, type UploadedImage } from "@/components/image-uploader";
import { PageHeader } from "@/components/ui";
import { createRecord, updateRecord, useFirestoreCollection, useFirestoreDocument } from "@/lib/firestore-data";
import type { CatalogueCandidate, Figure } from "@/types";

const slugify=(value:string)=>value.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

export default function NewFigurePage({searchParams}:{searchParams:Promise<{candidate?:string}>}){
  const {candidate:candidateId}=use(searchParams);const router=useRouter();const {user}=useAuth();
  const candidateState=useFirestoreDocument<CatalogueCandidate>(candidateId?`catalogueCandidates/${candidateId}`:null);const candidate=candidateState.data;
  const {data:figures}=useFirestoreCollection<Figure>("figures");const [error,setError]=useState("");const [images,setImages]=useState<UploadedImage[]>([]);const [busy,setBusy]=useState(false);const [slug,setSlug]=useState("");
  const resolvedSlug=slug||(candidate?slugify(candidate.name):"");
  if(user?.role!=="ADMIN")return <div className="page"><div className="empty card"><ShieldCheck/><h2>Administrator Access Required</h2><p>Only administrators can create master catalogue records.</p></div></div>;
  const submit=async(event:React.FormEvent<HTMLFormElement>)=>{event.preventDefault();if(busy)return;const form=new FormData(event.currentTarget);const finalSlug=slugify(String(form.get("slug")));if(figures.some(figure=>figure.slug===finalSlug)){setError("That slug exists. Choose a unique slug.");return}const catalogueImages=images.length?images.map(item=>item.url):candidate?.referenceImageUrl?[candidate.referenceImageUrl]:[];const imagePathnames=images.length?images.map(item=>item.pathname):candidate?.referenceImagePathname?[candidate.referenceImagePathname]:[];if(!catalogueImages.length){setError("Upload at least one verified image or choose a provider candidate with imported imagery.");return}setBusy(true);setError("");try{const figureRef=await createRecord("figures",{name:String(form.get("name")).trim(),slug:finalSlug,franchise:String(form.get("franchise")).trim(),character:String(form.get("character")).trim(),manufacturer:String(form.get("manufacturer")).trim(),series:String(form.get("series")).trim(),scale:String(form.get("scale")).trim(),releaseYear:Number(form.get("releaseYear"))||0,description:String(form.get("description")).trim(),image:catalogueImages[0],images:catalogueImages,imagePathnames,owned:0,wanted:0,...(candidate?{sources:[{source:candidate.source,sourceId:candidate.sourceId,sourceUrl:candidate.sourceUrl}]}:{})});if(candidate)await updateRecord(`catalogueCandidates/${candidate.id}`,{status:"APPROVED",figureId:figureRef.id,reviewedBy:user.uid});router.push(`/figures/${finalSlug}`)}catch(reason){setError(reason instanceof Error?reason.message:"Catalogue entry failed. Try again.")}finally{setBusy(false)}};
  const common={autoComplete:"off"} as const;
  return <div className="page" style={{maxWidth:980}}>
    {candidate&&<Link className="admin-back" href="/admin/imports"><ArrowLeft/>Back to catalogue imports</Link>}
    <PageHeader eyebrow="Admin Catalogue" title={candidate?"Verify Imported Candidate":"Add a Master Figure"} description={candidate?"Correct the marketplace data and supply verified catalogue imagery before publishing.":"Create a verified master record with up to six private catalogue images."}/>
    {candidate&&<aside className="candidate-source-note">{candidate.referenceImageUrl&&<Image className="candidate-reference-image" src={candidate.referenceImageUrl} alt={`${candidate.name} reference`} width={90} height={90}/>}<ShieldCheck/><div><strong>Reference evidence from {candidate.manufacturer||candidate.source}</strong><span>{candidate.sourceQuery}</span></div><a href={candidate.sourceUrl} target="_blank" rel="noreferrer">Inspect official source <ExternalLink/></a></aside>}
    {candidateState.error&&<div className="form-alert" role="alert">{candidateState.error}</div>}
    <form key={candidate?.id||"new"} className="card form-stack" style={{padding:25}} onSubmit={submit} aria-busy={busy}>
      {error&&<div className="demo-note" role="alert">{error}</div>}
      <div className="form-row"><label><span className="label">Figure Name</span><input required name="name" {...common} className="field" defaultValue={candidate?.name||""}/></label><label><span className="label">Slug</span><input required name="slug" {...common} spellCheck={false} pattern="[a-z0-9-]+" className="field" value={resolvedSlug} onChange={event=>setSlug(slugify(event.target.value))}/></label></div>
      <div className="form-row"><label><span className="label">Franchise</span><input required name="franchise" {...common} className="field" defaultValue={candidate?.franchise||""}/></label><label><span className="label">Character</span><input required name="character" {...common} className="field" defaultValue={candidate?.character||""}/></label></div>
      <div className="form-row"><label><span className="label">Manufacturer</span><input required name="manufacturer" {...common} className="field" defaultValue={candidate?.manufacturer||""}/></label><label><span className="label">Series</span><input name="series" {...common} className="field" defaultValue={candidate?.series||""}/></label></div>
      <div className="form-row"><label><span className="label">Scale</span><input name="scale" {...common} className="field" defaultValue={candidate?.scale||""}/></label><label><span className="label">Release Year</span><input name="releaseYear" type="number" min="1900" max="2100" inputMode="numeric" className="field" defaultValue={candidate?.releaseYear||""}/></label></div>
      <div className="review-divider"><span>Verified catalogue images</span></div><p className="meta">{candidate?.referenceImageUrl?"The imported provider image will be used unless you upload a replacement.":"Upload imagery you are permitted to use. Marketplace imagery is not copied into TinkerTown."}</p><ImageUploader value={images} onChange={setImages} maxImages={6}/>
      <label><span className="label">Catalogue Description</span><textarea required name="description" {...common} className="field" defaultValue={candidate?.description||""} placeholder="Describe the official figure, included accessories, edition, and identifying details."/></label>
      <button disabled={busy} className="btn btn-primary">{busy?"Creating…":candidate?"Approve & Create Figure":"Create Catalogue Entry"}</button>
    </form>
  </div>;
}
