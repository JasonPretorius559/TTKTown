"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, Check, ImageIcon, PackagePlus, Search, Tag } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { ImageUploader, type UploadedImage } from "@/components/image-uploader";
import { createCommunityFigure, createRecord, useFirestoreCollection } from "@/lib/firestore-data";
import { useUnsavedChanges } from "@/lib/use-unsaved-changes";
import type { Figure } from "@/types";
import { isVisibleFigure } from "@/lib/utils";

export default function SellPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requesting = searchParams.get("mode") === "request";
  const preselectedFigureId = searchParams.get("figureId") || "";
  const figuresState = useFirestoreCollection<Figure>("figures", { orderBy:["name","asc"] });
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [requested, setRequested] = useState(false);
  const [createdFigureId, setCreatedFigureId] = useState("");
  const [selectedFigureId, setSelectedFigureId] = useState(preselectedFigureId);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  useUnsavedChanges(dirty && !saving);

  const submitListing = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    if (!figuresState.data.length) { setError("Request the figure first so it can be added to the catalogue."); return; }
    if (!images.length) { setError("Upload at least one listing image."); return; }
    const form = new FormData(event.currentTarget);
    setSaving(true); setError("");
    try {
      const result = await createRecord("listings", {
        figureId:String(form.get("figureId")), sellerId:user.uid, seller:user.username,
        sellerName:user.displayName, sellerAvatar:user.avatar || "/tinkertown-mark.svg",
        title:String(form.get("title")).trim(), description:String(form.get("description")).trim(),
        price:Number(form.get("price")), priceCents:Math.round(Number(form.get("price")) * 100), currency:"ZAR",
        condition:String(form.get("condition")), image:images[0].url, images:images.map(item=>item.url),
        imagePathnames:images.map(item=>item.pathname), status:"ACTIVE"
      });
      setDirty(false); router.push(`/marketplace/listings/${result.id}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The listing could not be published."); }
    finally { setSaving(false); }
  };

  const submitRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    const form = new FormData(event.currentTarget);
    if (!images.length) { setError("Upload at least one clear reference image of the figure."); return; }
    setSaving(true); setError("");
    try {
      const result = await createCommunityFigure({
        requesterId:user.uid, requesterUsername:user.username, name:String(form.get("name")).trim(),
        franchise:String(form.get("franchise")).trim(), manufacturer:String(form.get("manufacturer")).trim(),
        notes:String(form.get("notes")).trim(), image:images[0].url, images:images.map(item=>item.url),
        imagePathnames:images.map(item=>item.pathname)
      });
      setDirty(false); setCreatedFigureId(result.figureId); setRequested(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The request could not be sent."); }
    finally { setSaving(false); }
  };

  return <div className="page sell-page">
    <header className="sell-heading">
      <div><div className="eyebrow">Seller Counter</div><h1>Create a Marketplace Listing</h1><p>Listings are products for sale. Shelf updates and collector stories belong in <Link href="/home">Town Square</Link>.</p></div>
      <span className="market-trust"><Check size={16}/> Collector-to-collector</span>
    </header>
    <div className="sell-workspace">
      <aside className="sell-rail" aria-label="Listing steps">
        <div className="sell-step active"><span>1</span><div><strong>Match the figure</strong><small>Use the catalogue</small></div></div>
        <div className="sell-step"><span>2</span><div><strong>Show its condition</strong><small>Add your photos</small></div></div>
        <div className="sell-step"><span>3</span><div><strong>Set the offer</strong><small>Price and publish</small></div></div>
        <div className="sell-tip"><Tag size={18}/><strong>Clear listings sell better.</strong><p>Photograph the actual item, box, seals, and any damage.</p></div>
      </aside>
      <section className="sell-panel card">
        <div className="sell-panel-head"><div><span>New listing</span><h2>{requesting ? "Request a missing figure" : "What are you selling?"}</h2></div><PackagePlus size={27}/></div>
        {error && <div className="form-alert" role="alert"><AlertCircle size={18}/>{error}</div>}
        {requesting || (!figuresState.loading && !figuresState.data.length) ? (
          requested ? <div className="request-success"><span><Check size={24}/></span><h2>Figure added instantly</h2><p>Your community-submitted record is live now. You can use it immediately while the catalogue team verifies the details in the background.</p><div className="action-stack"><button className="btn btn-dark" onClick={()=>{setImages([]);setRequested(false);router.replace(`/marketplace/sell?figureId=${createdFigureId}`)}}>Continue to Listing</button><Link className="btn btn-outline" href="/collection">Add to Collection</Link></div></div>
          : <form className="form-stack" onChange={()=>setDirty(true)} onSubmit={submitRequest}>
              <div className="catalogue-note"><Search size={20}/><div><strong>Create a community catalogue record.</strong><p>It becomes usable immediately. Moderators verify it later without changing the record used by your collection or listing.</p></div></div>
              <label><span className="label">Figure Name</span><input required autoComplete="off" className="field" name="name" placeholder="e.g. Spider-Man Advanced Suit…"/></label>
              <div className="form-row"><label><span className="label">Franchise</span><input required autoComplete="off" className="field" name="franchise" placeholder="e.g. Marvel…"/></label><label><span className="label">Manufacturer</span><input autoComplete="off" className="field" name="manufacturer" placeholder="e.g. Hot Toys…"/></label></div>
              <label><span className="label">Notes for the Catalogue Team</span><textarea autoComplete="off" className="field" name="notes" placeholder="Series, scale, release year, or anything that helps identify it…"/></label>
              <div className="sell-divider"><span><ImageIcon size={15}/> Figure reference image</span></div>
              <ImageUploader value={images} onChange={value=>{setImages(value);setDirty(true)}} maxImages={4}/>
              <div className="sell-form-actions">{figuresState.data.length>0&&<button type="button" className="btn btn-ghost" onClick={()=>router.replace("/marketplace/sell")}>Cancel</button>}<button disabled={saving} className="btn btn-primary">{saving?"Adding…":"Add & Use Figure"}<ArrowRight size={17}/></button></div>
            </form>
        ) : (
          <form className="form-stack" onChange={()=>setDirty(true)} onSubmit={submitListing}>
            <label><span className="label">Catalogue figure</span><select required className="field" name="figureId" disabled={figuresState.loading} value={selectedFigureId} onChange={event=>setSelectedFigureId(event.target.value)}><option value="">{figuresState.loading?"Loading catalogue…":"Choose the matching figure"}</option>{figuresState.data.filter(isVisibleFigure).map(figure=><option value={figure.id} key={figure.id}>{figure.name} · {figure.manufacturer}{figure.verificationStatus==="COMMUNITY"?" · Community submitted":""}</option>)}</select></label>
            {figuresState.error&&<div className="form-alert"><AlertCircle size={18}/>{figuresState.error}</div>}
            <button type="button" className="missing-figure" onClick={()=>router.replace("/marketplace/sell?mode=request")}><Search size={17}/><span><strong>Can’t find your figure?</strong><small>Add a community record instantly</small></span><ArrowRight size={16}/></button>
            <div className="sell-divider"><span><ImageIcon size={15}/> Actual item photos</span></div>
            <ImageUploader value={images} onChange={value=>{setImages(value);setDirty(true)}} maxImages={8}/>
            <div className="sell-divider"><span><Tag size={15}/> Listing details</span></div>
            <label><span className="label">Listing Title</span><input required maxLength={100} autoComplete="off" className="field" name="title" placeholder="Describe the exact item buyers will receive…"/></label>
            <div className="form-row"><label><span className="label">Condition</span><select name="condition" className="field"><option value="SEALED">Sealed</option><option value="NEW_OPENED">New, opened</option><option value="LIKE_NEW">Like new</option><option value="GOOD">Good</option><option value="FAIR">Fair</option><option value="DAMAGED">Damaged</option></select></label><label><span className="label">Price (ZAR)</span><input required min="1" step="1" inputMode="numeric" className="field" name="price" type="number" placeholder="0…"/></label></div>
            <label><span className="label">Description</span><textarea autoComplete="off" className="field" name="description" placeholder="Mention box condition, included accessories, flaws, and delivery options…"/></label>
            <div className="sell-form-actions"><span>Published listings are visible immediately.</span><button disabled={saving||figuresState.loading} className="btn btn-primary">{saving?"Publishing…":"Publish listing"}<ArrowRight size={17}/></button></div>
          </form>
        )}
      </section>
    </div>
  </div>;
}
