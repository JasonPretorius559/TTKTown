"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Boxes, MessageCircle, PackageSearch, Plus, ShieldCheck, Sparkles } from "lucide-react";
import { DataState, Filters, ListingCard } from "@/components/ui";
import { useFirestoreCollection } from "@/lib/firestore-data";
import type { Figure, Listing } from "@/types";

export default function MarketplacePage(){
  const params=useSearchParams();
  const listingsState=useFirestoreCollection<Listing>("listings",{where:[["status","==","ACTIVE"]],orderBy:["createdAt","desc"],limit:100});
  const {data:figures}=useFirestoreCollection<Figure>("figures");
  const q=(params.get("q")||"").toLowerCase();const franchise=params.get("franchise")||"";const maker=params.get("maker")||"";const sort=params.get("sort")||"newest";
  const listings=listingsState.data.filter(l=>{const f=figures.find(item=>item.id===l.figureId);return f&&(!q||[l.title,l.seller,f.name,f.character].some(v=>v?.toLowerCase().includes(q)))&&(!franchise||f.franchise===franchise)&&(!maker||f.manufacturer===maker)}).sort((a,b)=>sort==="price"?a.price-b.price:sort==="name"?a.title.localeCompare(b.title):0);
  const franchises=[...new Set(figures.map(f=>f.franchise).filter(Boolean))].sort();const manufacturers=[...new Set(figures.map(f=>f.manufacturer).filter(Boolean))].sort();

  return <div className="page market-page">
    <section className="market-hero">
      <div className="market-hero-copy"><div className="eyebrow"><Sparkles size={13}/> Collector Marketplace</div><h1>Every shelf has<br/>a missing story.</h1><p>Find authentic figures from collectors across South Africa, each connected to TinkerTown’s master catalogue.</p><div className="hero-actions"><Link className="btn btn-primary" href="/marketplace/sell"><Plus size={18}/>Sell a Figure</Link><Link className="market-text-link" href="/marketplace-rules"><ShieldCheck size={17}/>How safe trading works <ArrowRight size={15}/></Link></div></div>
      <div className="market-showcase" aria-hidden="true"><div className="showcase-halo"/><div className="showcase-card showcase-one"><Image src="/figure-fox.png" alt="" fill sizes="190px"/></div><div className="showcase-card showcase-two"><Image src="/figure-aria.png" alt="" fill sizes="190px"/></div><div className="showcase-card showcase-three"><Image src="/figure-luna.png" alt="" fill sizes="190px"/></div><div className="showcase-shelf"/></div>
    </section>
    <section className="market-facts" aria-label="Marketplace overview"><div><Boxes size={18}/><span><strong>{listings.length}</strong> live listings</span></div><div><PackageSearch size={18}/><span><strong>{figures.length}</strong> catalogue figures</span></div><div><MessageCircle size={18}/><span><strong>Direct</strong> collector chat</span></div><div><ShieldCheck size={18}/><span><strong>Clear</strong> trade guidance</span></div></section>
    <section className="market-browse-head"><div><div className="eyebrow">Browse the market</div><h2>Fresh Shelf Finds</h2><p>{listings.length?`${listings.length} active collector listings.`:"New listings will appear here as collectors put figures up for sale."}</p></div><Link href="/marketplace/selling">Manage my listings <ArrowRight size={15}/></Link></section>
    <div className="market-filter-surface card"><Filters placeholder="Search by figure, character, seller…" franchises={franchises} manufacturers={manufacturers}/></div>
    {listingsState.loading||listingsState.error?<DataState loading={listingsState.loading} error={listingsState.error} empty={false}><span/></DataState>:listings.length?<div className="market-browser"><aside className="market-filter-card card"><strong>Shop with confidence</strong><p>Every listing is connected to a catalogue figure and a TinkerTown collector profile.</p><div><ShieldCheck size={17}/><span>Collector identity</span></div><div><span aria-hidden="true">✓</span><span>Live availability</span></div></aside><div className="shelf-grid market-grid">{listings.map(l=><ListingCard key={l.id} listing={l} figure={figures.find(item=>item.id===l.figureId)}/>)}</div></div>:<section className="market-empty card"><div className="empty-visual" aria-hidden="true"><div className="empty-box"><PackageSearch size={44}/></div><span/><span/><span/></div><div className="empty-copy"><div className="eyebrow">The shelves are quiet—for now</div><h2>Be the first find in the marketplace.</h2><p>There are no active listings yet. Start the collector economy by listing a figure, or explore the catalogue and build your wishlist while you wait.</p><div className="empty-actions"><Link className="btn btn-primary" href="/marketplace/sell"><Plus size={17}/>List the first figure</Link><Link className="btn btn-outline" href="/catalogue">Explore Catalogue <ArrowRight size={15}/></Link></div><div className="empty-promises"><span><ShieldCheck size={14}/> Catalogue-linked listings</span><span><MessageCircle size={14}/> Collector-to-collector chat</span></div></div></section>}
  </div>;
}
