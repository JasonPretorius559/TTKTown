"use client";

import Image from "next/image";
import Link from "next/link";
import { PackageOpen, Plus } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { DataState, EmptyState, PageHeader } from "@/components/ui";
import { useFirestoreCollection } from "@/lib/firestore-data";
import { formatZar } from "@/lib/utils";
import type { Listing } from "@/types";

export default function MarketplaceSellingPage() {
  const { user } = useAuth();
  const state = useFirestoreCollection<Listing>("listings", { where:[["sellerId","==",user?.uid||"__none__"]], orderBy:["createdAt","desc"] });
  return <div className="page"><PageHeader eyebrow="Marketplace · Seller hub" title="Your listings" description="Manage the figures you are selling, separate from your Town Square posts." action={<Link href="/marketplace/sell" className="btn btn-primary"><Plus size={17}/>New listing</Link>}/><DataState loading={state.loading} error={state.error} empty={false}>{!state.data.length ? <EmptyState title="Your seller shelf is empty" description="Create your first listing and it will appear here." action={<Link href="/marketplace/sell" className="btn btn-dark"><PackageOpen size={17}/>List a figure</Link>}/> : <div className="seller-list">{state.data.map(listing=><Link href={`/marketplace/listings/${listing.id}`} className="list-card card" key={listing.id}><Image src={listing.image} alt="" width={90} height={90}/><div className="list-card-copy"><span className="badge">{listing.status}</span><h3>{listing.title}</h3><p>{formatZar(listing.price)}</p></div></Link>)}</div>}</DataState></div>;
}
