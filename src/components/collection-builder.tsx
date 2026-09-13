"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Boxes, Check, ChevronRight, CircleDollarSign, Eye, Grid2X2,
  Heart, Layers3, List, LockKeyhole, PackagePlus, Pencil, Plus, Search, Share2,
  ShoppingBag, Sparkles, Tag, Trash2, Users, X
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { DataState, EmptyState } from "@/components/ui";
import { FigureCaptureMatcher } from "@/components/figure-capture-matcher";
import {
  addOwnedFigure, createRecord, removeRecord, setOwnedFigureFavourite, updateRecord, useFirestoreCollection, useFirestoreDocument
} from "@/lib/firestore-data";
import { formatZar } from "@/lib/utils";
import type {
  CollectionFigure, CollectionVisibility, Figure, Listing, OwnedFigure, UserCollection
} from "@/types";

type TimestampLike={toDate?:()=>Date;seconds?:number};
const dateOf=(value:unknown)=>{if(!value)return null;if(value instanceof Date)return value;const stamp=value as TimestampLike;if(stamp.toDate)return stamp.toDate();if(stamp.seconds)return new Date(stamp.seconds*1000);return null};
const conditionLabel=(value:string)=>({NEW:"New",LIKE_NEW:"Like new",GOOD:"Good",FAIR:"Fair",POOR:"Poor"}[value]||value);
const visibilityIcon={PRIVATE:LockKeyhole,FOLLOWERS:Users,PUBLIC:Eye};

function useCollectionData(targetUserId?:string,visibleCollectionId?:string){
  const {user}=useAuth();
  const ownerId=targetUserId||user?.uid;
  const ownView=Boolean(user&&ownerId===user.uid);
  const figures=useFirestoreCollection<Figure>("figures");
  const owned=useFirestoreCollection<OwnedFigure>(ownView&&ownerId?`users/${ownerId}/ownedFigures`:"");
  const collections=useFirestoreCollection<UserCollection>(ownView&&ownerId?`users/${ownerId}/collections`:"");
  const memberships=useFirestoreCollection<CollectionFigure>(ownerId?`users/${ownerId}/collectionFigures`:"",!ownView&&visibleCollectionId?{where:[["collectionId","==",visibleCollectionId]]}:{});
  const listings=useFirestoreCollection<Listing>("listings",{where:[["status","==","ACTIVE"]],limit:250});
  return {user,ownerId,ownView,figures,owned,collections,memberships,listings};
}

function median(values:number[]){if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b);const middle=Math.floor(sorted.length/2);return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2}
function valueMap(listings:Listing[]){const grouped=new Map<string,number[]>();listings.forEach(item=>{if(Number.isFinite(item.price)&&item.price>0)grouped.set(item.figureId,[...(grouped.get(item.figureId)||[]),item.price])});return new Map([...grouped].map(([id,values])=>[id,median(values)]))}

function Dialog({title,description,onClose,children,wide=false}:{title:string;description:string;onClose:()=>void;children:React.ReactNode;wide?:boolean}){
  useEffect(()=>{const close=(event:KeyboardEvent)=>{if(event.key==="Escape")onClose()};const previous=document.body.style.overflow;document.body.style.overflow="hidden";window.addEventListener("keydown",close);return()=>{document.body.style.overflow=previous;window.removeEventListener("keydown",close)}},[onClose]);
  return <div className="collection-dialog-backdrop" role="presentation" onMouseDown={event=>{if(event.currentTarget===event.target)onClose()}}>
    <section className={`collection-dialog ${wide?"wide":""}`} role="dialog" aria-modal="true" aria-labelledby="collection-dialog-title">
      <header><div><div className="eyebrow">Collection Builder</div><h2 id="collection-dialog-title">{title}</h2><p>{description}</p></div><button aria-label="Close" onClick={onClose}><X/></button></header>
      {children}
    </section>
  </div>
}

function CollectionForm({userId,onClose,editing}:{userId:string;onClose:()=>void;editing?:UserCollection}){
  const [name,setName]=useState(editing?.name||"");const [description,setDescription]=useState(editing?.description||"");
  const [visibility,setVisibility]=useState<CollectionVisibility>(editing?.visibility||"PRIVATE");const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  const save=async(event:React.FormEvent)=>{event.preventDefault();if(!name.trim()||busy)return;setBusy(true);setError("");try{const value={userId,name:name.trim(),description:description.trim(),visibility};if(editing)await updateRecord(`users/${userId}/collections/${editing.id}`,value);else await createRecord(`users/${userId}/collections`,value);onClose()}catch(reason){setError(reason instanceof Error?reason.message:"Could not save the collection.")}finally{setBusy(false)}};
  return <form className="collection-form" onSubmit={save}>
    <label><span className="label">Collection name</span><input className="field" value={name} onChange={e=>setName(e.target.value)} maxLength={80} autoFocus placeholder="Hot Toys Marvel" required/></label>
    <label><span className="label">Description <small>Optional</small></span><textarea className="field" value={description} onChange={e=>setDescription(e.target.value)} maxLength={300} placeholder="What brings these pieces together?"/></label>
    <fieldset className="visibility-field"><legend className="label">Who can see it?</legend>{(["PRIVATE","FOLLOWERS","PUBLIC"] as CollectionVisibility[]).map(value=>{const Icon=visibilityIcon[value];return <label key={value} className={visibility===value?"selected":""}><input type="radio" name="visibility" value={value} checked={visibility===value} onChange={()=>setVisibility(value)}/><Icon/><span><strong>{value[0]+value.slice(1).toLowerCase()}</strong><small>{value==="PRIVATE"?"Only you":value==="FOLLOWERS"?"People who follow you":"Anyone on TinkerTown"}</small></span><Check/></label>})}</fieldset>
    {error&&<p className="form-alert" role="alert">{error}</p>}
    <footer><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy||!name.trim()}>{busy?"Saving…":editing?"Save changes":"Create collection"}</button></footer>
  </form>
}

function AddFigureForm({userId,requesterUsername,figures,collections,onClose,defaultCollectionId}:{userId:string;requesterUsername:string;figures:Figure[];collections:UserCollection[];onClose:()=>void;defaultCollectionId?:string}){
  const [query,setQuery]=useState("");const [selected,setSelected]=useState<Figure|null>(null);const [condition,setCondition]=useState("GOOD");const [boxCondition,setBoxCondition]=useState("GOOD");
  const [acquisitionType,setAcquisitionType]=useState("PURCHASE");const [price,setPrice]=useState("");const [acquiredAt,setAcquiredAt]=useState("");const [purchasedFrom,setPurchasedFrom]=useState("");const [notes,setNotes]=useState("");
  const [favourite,setFavourite]=useState(false);const [forSale,setForSale]=useState(false);const [removeWishlist,setRemoveWishlist]=useState(true);
  const [collectionIds,setCollectionIds]=useState<string[]>(defaultCollectionId?[defaultCollectionId]:[]);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  const matches=useMemo(()=>{const needle=query.trim().toLowerCase();return (needle?figures.filter(f=>[f.name,f.character,f.franchise,f.manufacturer].some(value=>value?.toLowerCase().includes(needle))):figures).slice(0,8)},[figures,query]);
  const chooseFigure=(figure:Figure)=>{setSelected(figure);setQuery(figure.name)};
  const submit=async(event:React.FormEvent)=>{event.preventDefault();if(!selected||busy)return;setBusy(true);setError("");try{await addOwnedFigure(userId,{figureId:selected.id,condition,boxCondition,acquisitionType,purchasePrice:price?Number(price):undefined,currency:"ZAR",acquiredAt:acquiredAt||undefined,purchasedFrom:purchasedFrom.trim()||undefined,notes:notes.trim()||undefined,isFavourite:favourite,isForSale:forSale},collectionIds,removeWishlist);onClose()}catch(reason){setError(reason instanceof Error?reason.message:"Could not add this figure.")}finally{setBusy(false)}};
  return <form className="add-figure-form" onSubmit={submit}>
    <div className="capture-match-zone"><FigureCaptureMatcher figures={figures} userId={userId} requesterUsername={requesterUsername} onSelect={chooseFigure}/></div>
    <div className="catalogue-picker">
      <label className="collection-search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search catalogue by figure, character or franchise" autoFocus={!selected}/></label>
      <div className="catalogue-options">{matches.map(figure=><button type="button" key={figure.id} className={selected?.id===figure.id?"selected":""} onClick={()=>chooseFigure(figure)}><span className="catalogue-thumb"><Image src={figure.image||"/tinkertown-mark.svg"} alt="" fill sizes="56px"/></span><span><strong>{figure.name}</strong><small>{figure.franchise} · {figure.manufacturer}</small></span>{selected?.id===figure.id&&<Check/>}</button>)}</div>
      {!matches.length&&<div className="catalogue-no-match"><Boxes/><strong>No catalogue match</strong><p>Add it once as a community record and use it immediately.</p><Link href="/marketplace/sell?mode=request">Add a community figure <ChevronRight/></Link></div>}
    </div>
    <div className={`ownership-form ${selected?"ready":""}`}>
      {!selected?<div className="ownership-placeholder"><PackagePlus/><h3>Choose the exact figure</h3><p>Ownership details will appear here. Each save creates one physical copy.</p></div>:<>
        <div className="selected-figure"><span className="catalogue-thumb"><Image src={selected.image||"/tinkertown-mark.svg"} alt="" fill sizes="54px"/></span><div><small>Adding one physical copy</small><strong>{selected.name}</strong></div></div>
        <details className="optional-details">
          <summary><span><strong>Add details</strong><small>Condition, purchase info, collections and notes are optional</small></span><ChevronRight/></summary>
          <div className="optional-details-body">
        <div className="form-row"><label><span className="label">Figure condition</span><select className="field" value={condition} onChange={e=>setCondition(e.target.value)}><option value="NEW">New</option><option value="LIKE_NEW">Like new</option><option value="GOOD">Good</option><option value="FAIR">Fair</option><option value="POOR">Poor</option></select></label><label><span className="label">Box condition</span><select className="field" value={boxCondition} onChange={e=>setBoxCondition(e.target.value)}><option value="SEALED">Sealed</option><option value="GOOD">Good</option><option value="DAMAGED">Damaged</option><option value="NO_BOX">No box</option></select></label></div>
        <div className="form-row"><label><span className="label">Acquired as</span><select className="field" value={acquisitionType} onChange={e=>setAcquisitionType(e.target.value)}><option value="PURCHASE">Purchase</option><option value="GIFT">Gift</option><option value="TRADE">Trade</option><option value="OTHER">Other</option></select></label><label><span className="label">Purchase price <small>Optional</small></span><div className="money-field"><span>R</span><input className="field" type="number" min="0" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} placeholder="0.00"/></div></label></div>
        <div className="form-row"><label><span className="label">Date acquired <small>Optional</small></span><input className="field" type="date" value={acquiredAt} onChange={e=>setAcquiredAt(e.target.value)}/></label><label><span className="label">Purchased from <small>Optional</small></span><input className="field" value={purchasedFrom} onChange={e=>setPurchasedFrom(e.target.value)} maxLength={100} placeholder="Store or collector"/></label></div>
        <label><span className="label">Notes <small>Optional</small></span><textarea className="field compact" value={notes} onChange={e=>setNotes(e.target.value)} maxLength={500} placeholder="Edition, defects, display history…"/></label>
        {!!collections.length&&<fieldset className="collection-checks"><legend className="label">Add to collections <small>Optional</small></legend>{collections.map(item=><label key={item.id}><input type="checkbox" checked={collectionIds.includes(item.id)} onChange={()=>setCollectionIds(ids=>ids.includes(item.id)?ids.filter(id=>id!==item.id):[...ids,item.id])}/><span>{item.name}</span></label>)}</fieldset>}
        <div className="ownership-toggles"><label><input type="checkbox" checked={favourite} onChange={e=>setFavourite(e.target.checked)}/><Heart/><span><strong>Favourite piece</strong><small>Feature it on your collection overview</small></span></label><label><input type="checkbox" checked={forSale} onChange={e=>setForSale(e.target.checked)}/><Tag/><span><strong>Available for sale</strong><small>Mark intent now; create a listing separately</small></span></label><label><input type="checkbox" checked={removeWishlist} onChange={e=>setRemoveWishlist(e.target.checked)}/><Check/><span><strong>Remove from wishlist</strong><small>Done in the same database save</small></span></label></div>
          </div>
        </details>
      </>}
    </div>
    <footer>{error&&<p className="form-alert" role="alert">{error}</p>}<button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!selected||busy}>{busy?"Adding copy…":"Add to collection"}</button></footer>
  </form>
}

function FigureTile({owned,figure,marketValue,view="grid",onFavourite,action}:{owned:OwnedFigure;figure?:Figure;marketValue?:number|null;view?:"grid"|"list";onFavourite?:()=>void;action?:React.ReactNode}){
  if(!figure)return null;
  return <article className={`owned-figure-card card ${view}`}>
    <Link href={`/figures/${figure.slug}`} className="owned-figure-image"><Image src={figure.image||"/tinkertown-mark.svg"} alt={figure.name} fill sizes="(max-width: 700px) 50vw, 260px"/><span className="condition-ribbon">{conditionLabel(owned.condition)}</span></Link>
    <div className="owned-figure-copy"><div><span>{figure.franchise}</span><Link href={`/figures/${figure.slug}`}><h3>{figure.name}</h3></Link><small>{figure.manufacturer} · {owned.boxCondition.replace("_"," ").toLowerCase()} box</small></div><div className="owned-value"><span>Active listing median</span><strong>{marketValue?formatZar(marketValue):"No market data"}</strong></div></div>
    <div className="owned-figure-actions"><button aria-label={owned.isFavourite?"Remove from favourites":"Add to favourites"} className={owned.isFavourite?"favourite":""} onClick={onFavourite}><Heart fill={owned.isFavourite?"currentColor":"none"}/></button>{owned.isForSale&&<span><Tag/> For sale</span>}{action}</div>
  </article>
}

function CollectionCard({collection,memberships,figures}:{collection:UserCollection;memberships:CollectionFigure[];figures:Figure[]}){
  const entries=memberships.filter(item=>item.collectionId===collection.id);const images=entries.map(entry=>figures.find(f=>f.id===entry.figureId)?.image).filter(Boolean).slice(0,4) as string[];const Icon=visibilityIcon[collection.visibility];
  return <Link href={`/collection/${collection.id}`} className="user-collection-card card"><div className={`collection-collage count-${images.length}`}>{images.length?images.map((src,index)=><span key={`${src}-${index}`}><Image src={src} alt="" fill sizes="180px"/></span>):<span className="collection-empty-cover"><Layers3/></span>}</div><div className="collection-card-copy"><div><h3>{collection.name}</h3><p>{collection.description||"A personal shelf inside your TinkerTown collection."}</p></div><footer><span>{entries.length} {entries.length===1?"piece":"pieces"}</span><span><Icon/>{collection.visibility.toLowerCase()}</span><ChevronRight/></footer></div></Link>
}

export function CollectionBuilder(){
  const data=useCollectionData();const [addOpen,setAddOpen]=useState(false);const [createOpen,setCreateOpen]=useState(false);const [view,setView]=useState<"grid"|"list">("grid");const [search,setSearch]=useState("");const [condition,setCondition]=useState("");const [sort,setSort]=useState("newest");
  const figuresById=useMemo(()=>new Map(data.figures.data.map(item=>[item.id,item])),[data.figures.data]);const estimates=useMemo(()=>valueMap(data.listings.data),[data.listings.data]);
  const estimatedCopies=data.owned.data.filter(item=>estimates.get(item.figureId));const estimatedValue=estimatedCopies.reduce((sum,item)=>sum+(estimates.get(item.figureId)||0),0);
  const franchises=new Set(data.owned.data.map(item=>figuresById.get(item.figureId)?.franchise).filter(Boolean)).size;
  const thisMonth=data.owned.data.filter(item=>{const date=dateOf(item.createdAt),now=new Date();return date&&date.getMonth()===now.getMonth()&&date.getFullYear()===now.getFullYear()}).length;
  const visibleOwned=useMemo(()=>data.owned.data.filter(item=>{const figure=figuresById.get(item.figureId);return (!search||[figure?.name,figure?.franchise,figure?.manufacturer].some(value=>value?.toLowerCase().includes(search.toLowerCase())))&&(!condition||item.condition===condition)}).sort((a,b)=>sort==="name"?(figuresById.get(a.figureId)?.name||"").localeCompare(figuresById.get(b.figureId)?.name||""):sort==="value"?(estimates.get(b.figureId)||0)-(estimates.get(a.figureId)||0):Number(dateOf(b.createdAt)||0)-Number(dateOf(a.createdAt)||0)),[data.owned.data,figuresById,search,condition,sort,estimates]);
  const loading=data.figures.loading||data.owned.loading||data.collections.loading||data.memberships.loading;const error=data.figures.error||data.owned.error||data.collections.error||data.memberships.error;
  return <div className="page collection-builder-page">
    <section className="collection-ledger"><div className="ledger-copy"><div className="eyebrow">Your Cabinet</div><h1>Collection Builder</h1><p>Track every physical copy, organise shelves your way, and understand the market around what you own.</p><div className="ledger-actions"><button className="btn btn-primary" onClick={()=>setAddOpen(true)}><PackagePlus/>Add figure</button><button className="btn btn-outline" onClick={()=>setCreateOpen(true)}><Plus/>Create collection</button></div></div><div className="ledger-stats"><div><Boxes/><strong>{data.owned.data.length}</strong><span>physical figures</span></div><div><CircleDollarSign/><strong>{estimatedCopies.length?formatZar(estimatedValue):"—"}</strong><span>listing estimate · {estimatedCopies.length}/{data.owned.data.length} covered</span></div><div><Layers3/><strong>{data.collections.data.length}</strong><span>collections</span></div><div><Sparkles/><strong>{thisMonth}</strong><span>added this month</span></div></div></section>
    <DataState loading={loading} error={error} empty={false}>
      <section className="collection-section"><div className="collection-section-head"><div><span className="eyebrow">Organised shelves</span><h2>My collections</h2></div><button className="text-action" onClick={()=>setCreateOpen(true)}><Plus/>New collection</button></div>{data.collections.data.length?<div className="user-collection-grid">{data.collections.data.map(item=><CollectionCard key={item.id} collection={item} memberships={data.memberships.data} figures={data.figures.data}/>)}</div>:<EmptyState title="Build your first shelf" description="Create collections by theme, character, display case, or any system that makes sense to you." action={<button className="btn btn-dark" onClick={()=>setCreateOpen(true)}>Create collection</button>}/>}</section>
      <section className="collection-section"><div className="collection-section-head"><div><span className="eyebrow">Inventory</span><h2>All owned figures</h2><p>{franchises} {franchises===1?"franchise":"franchises"} across {data.owned.data.length} physical {data.owned.data.length===1?"copy":"copies"}</p></div><div className="view-switch"><button aria-label="Grid view" className={view==="grid"?"active":""} onClick={()=>setView("grid")}><Grid2X2/></button><button aria-label="List view" className={view==="list"?"active":""} onClick={()=>setView("list")}><List/></button></div></div>
        <div className="collection-filters"><label><Search/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search your collection"/></label><select value={condition} onChange={e=>setCondition(e.target.value)} aria-label="Filter by condition"><option value="">All conditions</option><option value="NEW">New</option><option value="LIKE_NEW">Like new</option><option value="GOOD">Good</option><option value="FAIR">Fair</option><option value="POOR">Poor</option></select><select value={sort} onChange={e=>setSort(e.target.value)} aria-label="Sort collection"><option value="newest">Recently added</option><option value="name">Name A–Z</option><option value="value">Market value</option></select></div>
        {visibleOwned.length?<div className={`owned-figure-grid ${view}`}>{visibleOwned.map(item=><FigureTile key={item.id} owned={item} figure={figuresById.get(item.figureId)} marketValue={estimates.get(item.figureId)} view={view} onFavourite={()=>data.user&&setOwnedFigureFavourite(data.user.uid,item.id,data.memberships.data.filter(member=>member.ownedFigureId===item.id).map(member=>member.id),!item.isFavourite)}/>)}</div>:<EmptyState title={data.owned.data.length?"No figures match":"Your cabinet is waiting"} description={data.owned.data.length?"Try changing your search or condition filter.":"Add your first physical figure from the verified TinkerTown catalogue."} action={!data.owned.data.length?<button className="btn btn-primary" onClick={()=>setAddOpen(true)}>Add first figure</button>:undefined}/>}</section>
    </DataState>
    {addOpen&&data.user&&<Dialog wide title="Add a physical figure" description="Capture it for an OCR match, or search the catalogue manually." onClose={()=>setAddOpen(false)}><AddFigureForm userId={data.user.uid} requesterUsername={data.user.username} figures={data.figures.data} collections={data.collections.data} onClose={()=>setAddOpen(false)}/></Dialog>}
    {createOpen&&data.user&&<Dialog title="Create a collection" description="A collection is your own grouping—it does not need to match a franchise." onClose={()=>setCreateOpen(false)}><CollectionForm userId={data.user.uid} onClose={()=>setCreateOpen(false)}/></Dialog>}
  </div>
}

export function CollectionDetail({collectionId}:{collectionId:string}){
  const currentUser=useAuth().user;const searchParams=useSearchParams();const requestedOwner=searchParams.get("owner")||currentUser?.uid;const data=useCollectionData(requestedOwner,collectionId);const collection=useFirestoreDocument<UserCollection>(data.ownerId?`users/${data.ownerId}/collections/${collectionId}`:null);const [addOpen,setAddOpen]=useState(false);const [editOpen,setEditOpen]=useState(false);const [view,setView]=useState<"grid"|"list">("grid");const [search,setSearch]=useState("");const [condition,setCondition]=useState("");const [notice,setNotice]=useState("");
  const figuresById=useMemo(()=>new Map(data.figures.data.map(item=>[item.id,item])),[data.figures.data]);const ownedById=useMemo(()=>new Map(data.owned.data.map(item=>[item.id,item])),[data.owned.data]);const estimates=useMemo(()=>valueMap(data.listings.data),[data.listings.data]);
  const members=data.memberships.data.filter(item=>item.collectionId===collectionId);const entries=members.map(member=>({member,owned:ownedById.get(member.ownedFigureId)||({id:member.ownedFigureId,userId:member.userId,figureId:member.figureId,condition:member.condition||"GOOD",boxCondition:member.boxCondition||"GOOD",acquisitionType:"OTHER",currency:"ZAR",isFavourite:Boolean(member.isFavourite),isForSale:Boolean(member.isForSale)} as OwnedFigure),figure:figuresById.get(member.figureId)})).filter(item=>item.figure).filter(item=>(!search||[item.figure?.name,item.figure?.franchise,item.figure?.manufacturer].some(value=>value?.toLowerCase().includes(search.toLowerCase())))&&(!condition||item.owned.condition===condition));
  const value=entries.reduce((sum,item)=>sum+(estimates.get(item.member.figureId)||0),0);const covered=entries.filter(item=>estimates.get(item.member.figureId)).length;
  const share=async()=>{const url=`${window.location.origin}/collection/${collectionId}?owner=${data.ownerId}`;await navigator.clipboard.writeText(url);setNotice("Collection link copied");setTimeout(()=>setNotice(""),2200)};
  const loading=collection.loading||data.figures.loading||data.owned.loading||data.memberships.loading;const error=collection.error||data.figures.error||data.owned.error||data.memberships.error;
  return <div className="page collection-detail-page"><DataState loading={loading} error={error} empty={!collection.data} emptyTitle="Collection not found" emptyText="This collection may have been removed or is private.">{collection.data&&<>
    <Link href="/collection" className="collection-back"><ArrowLeft/>All collections</Link>
    <header className="collection-detail-hero"><div><span className="visibility-badge">{(()=>{const Icon=visibilityIcon[collection.data.visibility];return <Icon/>})()}{collection.data.visibility.toLowerCase()}</span><h1>{collection.data.name}</h1><p>{collection.data.description||"A curated shelf from a TinkerTown cabinet."}</p></div><div className="collection-detail-actions"><button className="btn btn-outline" onClick={share}><Share2/>Share</button>{data.ownView&&<><button className="btn btn-outline" onClick={()=>setEditOpen(true)}><Pencil/>Edit</button><button className="btn btn-primary" onClick={()=>setAddOpen(true)}><Plus/>Add figure</button></>}</div><dl><div><dt>Pieces</dt><dd>{members.length}</dd></div><div><dt>Active listing estimate</dt><dd>{covered?formatZar(value):"—"}</dd><small>{covered}/{members.length} covered</small></div><div><dt>Favourite pieces</dt><dd>{entries.filter(item=>item.owned.isFavourite).length}</dd></div></dl></header>
    <section className="collection-section"><div className="collection-section-head"><div><span className="eyebrow">Shelf contents</span><h2>{entries.length} {entries.length===1?"physical piece":"physical pieces"}</h2></div><div className="view-switch"><button className={view==="grid"?"active":""} onClick={()=>setView("grid")} aria-label="Grid view"><Grid2X2/></button><button className={view==="list"?"active":""} onClick={()=>setView("list")} aria-label="List view"><List/></button></div></div><div className="collection-filters"><label><Search/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search this collection"/></label><select value={condition} onChange={e=>setCondition(e.target.value)}><option value="">All conditions</option><option value="NEW">New</option><option value="LIKE_NEW">Like new</option><option value="GOOD">Good</option><option value="FAIR">Fair</option><option value="POOR">Poor</option></select></div>
    {entries.length?<div className={`owned-figure-grid ${view}`}>{entries.map(({member,owned,figure})=><FigureTile key={member.id} owned={owned} figure={figure} marketValue={estimates.get(member.figureId)} view={view} onFavourite={data.ownView?()=>data.user&&setOwnedFigureFavourite(data.user.uid,owned.id,data.memberships.data.filter(item=>item.ownedFigureId===owned.id).map(item=>item.id),!owned.isFavourite):undefined} action={data.ownView?<div className="owned-card-menu"><Link href={`/marketplace/sell?figureId=${member.figureId}&ownedFigureId=${owned.id}`} title="Sell this copy"><ShoppingBag/></Link><button title="Remove from this collection" onClick={()=>data.user&&window.confirm(`Remove ${figure?.name} from this collection?`)&&removeRecord(`users/${data.user.uid}/collectionFigures/${member.id}`)}><Trash2/></button></div>:undefined}/>)}</div>:<EmptyState title="This shelf is empty" description={data.ownView?"Add an owned figure to start building this collection.":"This collector has not added any pieces here yet."} action={data.ownView?<button className="btn btn-primary" onClick={()=>setAddOpen(true)}>Add figure</button>:undefined}/>}</section>
    {addOpen&&data.user&&<Dialog wide title={`Add to ${collection.data.name}`} description="Capture it for an OCR match, then add this physical copy to the shelf." onClose={()=>setAddOpen(false)}><AddFigureForm userId={data.user.uid} requesterUsername={data.user.username} figures={data.figures.data} collections={data.collections.data} defaultCollectionId={collectionId} onClose={()=>setAddOpen(false)}/></Dialog>}
    {editOpen&&data.user&&<Dialog title="Edit collection" description="Update the shelf story and who is allowed to see it." onClose={()=>setEditOpen(false)}><CollectionForm userId={data.user.uid} editing={collection.data} onClose={()=>setEditOpen(false)}/></Dialog>}
    {notice&&<div className="toast" role="status">{notice}</div>}</>}</DataState></div>;
}
