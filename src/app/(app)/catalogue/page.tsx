"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { DataState, FigureCard, Filters, PageHeader } from "@/components/ui";
import { useAuth } from "@/components/auth-provider";
import { useFirestoreCollection } from "@/lib/firestore-data";
import type { Figure } from "@/types";
import { isVisibleFigure } from "@/lib/utils";

export default function CataloguePage(){
  const {user}=useAuth();const params=useSearchParams();
  const {data,loading,error}=useFirestoreCollection<Figure>("figures",{orderBy:["name","asc"],limit:100});
  const q=(params.get("q")||"").toLowerCase();const franchise=params.get("franchise")||"";const maker=params.get("maker")||"";const sort=params.get("sort")||"newest";
  const visible=data.filter(isVisibleFigure);const figures=visible.filter(f=>(!q||[f.name,f.character,f.franchise,f.manufacturer].some(v=>v?.toLowerCase().includes(q)))&&(!franchise||f.franchise===franchise)&&(!maker||f.manufacturer===maker)).sort((a,b)=>sort==="name"?a.name.localeCompare(b.name):(b.releaseYear||0)-(a.releaseYear||0));
  const franchises=[...new Set(visible.map(f=>f.franchise).filter(Boolean))].sort();const manufacturers=[...new Set(visible.map(f=>f.manufacturer).filter(Boolean))].sort();
  return <div className="page"><PageHeader eyebrow="Master catalogue" title="A World of Tiny Wonders" description="Browse trusted reference entries, track what you own, and find the next piece for your shelf." action={user?.role==="ADMIN"?<Link href="/admin/figures/new" className="btn btn-primary"><Plus size={18}/>Add a Figure</Link>:null}/><Filters franchises={franchises} manufacturers={manufacturers}/><DataState loading={loading} error={error} empty={!figures.length}><div className="shelf-grid">{figures.map(f=><FigureCard key={f.id} figure={f}/>)}</div></DataState></div>;
}
