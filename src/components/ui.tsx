"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Heart, PackageOpen, Search, ShieldCheck } from "lucide-react";
import type { Figure, Listing } from "@/types";
import { formatZar } from "@/lib/utils";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?:string; title:string; description?:string; action?:React.ReactNode }) {
  return <header className="page-header"><div>{eyebrow&&<div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description&&<p>{description}</p>}</div>{action}</header>;
}

export function FigureCard({ figure, listing, onWish }: { figure:Figure; listing?:Listing; onWish?:()=>void }) {
  if(listing)return <ListingCard listing={listing} figure={figure} onWish={onWish}/>;
  const href=`/figures/${figure.slug}`;
  return <article className="figure-card card">
    <div className="figure-image">{onWish&&<button className="heart-btn" aria-label="Add to wishlist" onClick={onWish}><Heart size={18}/></button>}<Link href={href}><Image src={figure.image} alt={figure.name} fill sizes="(max-width: 800px) 50vw, 25vw"/></Link></div>
    <div className="figure-card-body"><span className="badge">{figure.verificationStatus==="COMMUNITY"?"Community submitted":figure.franchise}</span><Link href={href}><h3>{figure.name}</h3></Link><div className="meta">{figure.manufacturer} · {figure.character}</div><div className="figure-demand"><span><strong>{figure.owned||0}</strong> owned</span><span><strong>{figure.wanted||0}</strong> wanted</span></div>
    </div>
  </article>;
}

export function ListingCard({listing,figure,onWish}:{listing:Listing;figure?:Figure;onWish?:()=>void}){return <article className="listing-card card"><div className="listing-image">{onWish&&<button className="heart-btn" aria-label="Save listing" onClick={onWish}><Heart size={18}/></button>}<Link href={`/marketplace/listings/${listing.id}`}><Image src={listing.image} alt={listing.title} fill sizes="(max-width: 800px) 50vw, 25vw"/></Link><span className="condition-chip">{listing.condition}</span></div><div className="listing-body"><Link href={`/marketplace/listings/${listing.id}`}><h3>{listing.title}</h3></Link>{figure&&<div className="meta">{figure.franchise} · {figure.manufacturer}</div>}<div className="listing-price">{formatZar(listing.price)}</div><div className="seller-row"><Image className="avatar" src={listing.sellerAvatar||"/tinkertown-mark.svg"} alt="" width={28} height={28}/><span><strong>{listing.sellerName||listing.seller}</strong><small><ShieldCheck size={12}/> Collector listing</small></span></div></div></article>}

export function Filters({ placeholder="Search the catalogue…", franchises=[], manufacturers=[] }: { placeholder?:string;franchises?:string[];manufacturers?:string[] }) {
  const router=useRouter();const pathname=usePathname();const searchParams=useSearchParams();
  const set=(name:string,value:string)=>{const next=new URLSearchParams(searchParams.toString());if(value)next.set(name,value);else next.delete(name);router.replace(`${pathname}${next.size?`?${next}`:""}`,{scroll:false})};
  return <div className="filters" role="search"><div className="search-inline"><Search size={17}/><input aria-label="Search items" autoComplete="off" name="q" className="field" placeholder={placeholder} value={searchParams.get("q")||""} onChange={event=>set("q",event.target.value)}/></div><select aria-label="Filter by franchise" name="franchise" className="field" value={searchParams.get("franchise")||""} onChange={event=>set("franchise",event.target.value)}><option value="">All franchises</option>{franchises.map(value=><option key={value} value={value}>{value}</option>)}</select><select aria-label="Filter by manufacturer" name="maker" className="field" value={searchParams.get("maker")||""} onChange={event=>set("maker",event.target.value)}><option value="">Any maker</option>{manufacturers.map(value=><option key={value} value={value}>{value}</option>)}</select><select aria-label="Sort items" name="sort" className="field" value={searchParams.get("sort")||"newest"} onChange={event=>set("sort",event.target.value)}><option value="newest">Newest first</option><option value="name">Name A–Z</option><option value="price">Price low–high</option></select></div>;
}

export function EmptyState({ title="Nothing here yet", description="Start exploring TinkerTown to fill this space.", action }: {title?:string;description?:string;action?:React.ReactNode}) {
  return <div className="empty card"><PackageOpen size={42}/><h2>{title}</h2><p>{description}</p>{action}</div>;
}

export function DataState({ loading, error, empty, children, emptyTitle, emptyText }: { loading:boolean; error:string|null; empty:boolean; children:React.ReactNode; emptyTitle?:string; emptyText?:string }) {
  if (loading) return <div className="empty card" role="status" aria-live="polite"><div className="badge">Loading from TinkerTown…</div></div>;
  if (error) return <div className="empty card" role="alert"><h2>Couldn’t Load This Page</h2><p>{error}</p><button className="btn btn-outline" onClick={()=>window.location.reload()}>Try Again</button></div>;
  if (empty) return <EmptyState title={emptyTitle} description={emptyText}/>;
  return <>{children}</>;
}
