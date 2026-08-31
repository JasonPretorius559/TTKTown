"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle2, DatabaseZap, ExternalLink, Play, ScanSearch, Search, ShieldCheck, XCircle } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { DataState, PageHeader } from "@/components/ui";
import { stageCatalogueImport, updateRecord, useFirestoreCollection } from "@/lib/firestore-data";
import { formatZar } from "@/lib/utils";
import type { CatalogueCandidate, CatalogueImportRun } from "@/types";

type ImportResult={error?:string;runId?:string;source?:CatalogueCandidate["source"];franchise?:string;queries?:string[];discovered?:number;candidates?:CatalogueCandidate[]};
type CatalogueSource={id:string;label:string;logo:string;url:string;body:Record<string,unknown>;source:CatalogueCandidate["source"];franchise:string;scope:string;note:string;logoClass?:string};

const CATALOGUE_SOURCES:CatalogueSource[]=[
  {id:"funko",label:"Funko",logo:"/provider-logos/funko.svg",url:"/api/admin/catalogue/imports/funko",body:{limit:25},source:"FUNKO",franchise:"Multi-franchise",scope:"Collectible figure lines",note:"25 review candidates"},
  {id:"mattel",label:"Mattel",logo:"/provider-logos/mattel.svg",url:"/api/admin/catalogue/imports/providers",body:{provider:"MATTEL",limit:25},source:"MATTEL",franchise:"Multi-franchise",scope:"Collector brands and releases",note:"25 review candidates"},
  {id:"hot-wheels",label:"Hot Wheels Wiki",logo:"/provider-logos/hot-wheels.png",url:"/api/admin/catalogue/imports/providers",body:{provider:"HOT_WHEELS_WIKI",limit:25},source:"HOT_WHEELS_WIKI",franchise:"Hot Wheels",scope:"Community model catalogue",note:"25 review candidates",logoClass:"logo-wide"},
  {id:"pokemon",label:"Pokémon TCG Wiki",logo:"/provider-logos/pokemon-tcg.png",url:"/api/admin/catalogue/imports/providers",body:{provider:"POKEMON_TCG_WIKI",limit:25},source:"POKEMON_TCG_WIKI",franchise:"Pokémon Trading Card Game",scope:"Sets and trading cards",note:"25 review candidates",logoClass:"logo-tall"},
  {id:"gcd",label:"Grand Comics Database",logo:"/provider-logos/gcd.png",url:"/api/admin/catalogue/imports/providers",body:{provider:"GCD",limit:25},source:"GCD",franchise:"Multi-franchise",scope:"Selected comic issue lanes",note:"25 review candidates"},
  {id:"mcfarlane",label:"McFarlane Toys",logo:"/provider-logos/mcfarlane.png",url:"/api/admin/catalogue/imports/providers",body:{provider:"MCFARLANE",limit:10},source:"MCFARLANE",franchise:"Multi-franchise",scope:"Official figures and statues",note:"10 review candidates",logoClass:"logo-dark"},
  {id:"curated",label:"Curated Sources",logo:"/tinkertown-logo.svg",url:"/api/admin/catalogue/imports/top-collectibles",body:{},source:"WEB",franchise:"Multi-franchise",scope:"Verified collector highlights",note:"Editor-maintained"},
];

export default function CatalogueImportsPage(){
  const {user}=useAuth();
  const candidates=useFirestoreCollection<CatalogueCandidate>("catalogueCandidates",{limit:300});
  const runs=useFirestoreCollection<CatalogueImportRun>("catalogueImportRuns",{orderBy:["createdAt","desc"],limit:10});
  const [query,setQuery]=useState("");const [status,setStatus]=useState("PENDING");const [busySource,setBusySource]=useState<string|null>(null);const [progress,setProgress]=useState("");const [message,setMessage]=useState("");const [error,setError]=useState("");
  const visible=useMemo(()=>candidates.data.filter(item=>(!status||item.status===status)&&(!query||[item.name,item.character,item.manufacturer,item.series].some(value=>value?.toLowerCase().includes(query.toLowerCase())))).sort((a,b)=>a.manufacturer.localeCompare(b.manufacturer)||a.name.localeCompare(b.name)),[candidates.data,query,status]);
  const pending=candidates.data.filter(item=>item.status==="PENDING").length;const manufacturers=new Set(candidates.data.map(item=>item.manufacturer).filter(Boolean)).size;const latest=runs.data[0];const latestBySource=new Map<CatalogueCandidate["source"],CatalogueImportRun>();runs.data.forEach(run=>{if(!latestBySource.has(run.source))latestBySource.set(run.source,run)});

  const importCatalogue=async(source:CatalogueSource)=>{
    if(busySource||!user)return;
    setBusySource(source.id);setError("");setMessage("");
    try{
      setProgress(`Fetching a small ${source.label} review batch…`);
      const response=await fetch(source.url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(source.body)});const result=await response.json() as ImportResult;
      if(!response.ok||!result.runId||!result.candidates)throw new Error(result.error||"Import failed");
      await stageCatalogueImport(user.uid,{id:result.runId,source:result.source||source.source,franchise:result.franchise||source.franchise,queries:result.queries||[],discovered:result.discovered||0},result.candidates,candidates.data);
      setMessage(`${source.label}: ${result.candidates.length} candidates are ready for review. Nothing was published automatically.`);
    }catch(reason){setError(reason instanceof Error?reason.message:"Catalogue import failed")}finally{setProgress("");setBusySource(null)}
  };

  const mark=async(item:CatalogueCandidate,next:"REJECTED"|"DUPLICATE")=>{if(!user)return;await updateRecord(`catalogueCandidates/${item.id}`,{status:next,reviewedBy:user.uid})};
  if(user?.role!=="ADMIN")return <div className="page"><div className="empty card"><ShieldCheck/><h2>Administrator Access Required</h2><p>Only administrators can run or review catalogue imports.</p></div></div>;
  return <div className="page catalogue-import-page">
    <PageHeader eyebrow="Admin Catalogue" title="Source Lookup Desk" description="Bring in a small review batch only when the community needs catalogue coverage." action={<Link className="btn btn-outline" href="/admin">Back to admin</Link>}/>
    <section className="import-console source-console">
      <div><span className="eyebrow">On-demand catalogue</span><h2>Grow from real scans.</h2><p>OCR matches the shared TinkerTown catalogue first. When a collector scans something new, they can create a community record immediately. Provider lookups below are small admin review batches—never full catalogue mirrors.</p></div>
      <div className="import-principle"><ScanSearch/><span><strong>OCR stays useful</strong><small>Every confirmed community scan improves matching for the next collector.</small></span></div>
    </section>
    {message&&<div className="import-message success" role="status"><CheckCircle2/>{message}</div>}{error&&<div className="import-message error" role="alert"><XCircle/>{error}</div>}
    <section className="catalogue-source-section" aria-labelledby="catalogue-source-heading"><div className="source-section-head"><div><span className="eyebrow">Optional source lookup</span><h2 id="catalogue-source-heading">Fetch candidates for review</h2></div><span>{CATALOGUE_SOURCES.length} connected sources</span></div><div className="catalogue-source-grid">{CATALOGUE_SOURCES.map(source=>{const run=latestBySource.get(source.source);const active=busySource===source.id;return <article className={`catalogue-source-card ${active?"is-importing":""}`} key={source.id}><div className={`provider-logo-frame ${source.logoClass||""}`}><Image src={source.logo} alt={`${source.label} logo`} width={240} height={80}/></div><div className="source-card-copy"><div className="source-card-title"><h3>{source.label}</h3><span className={`source-status ${run?.status.toLowerCase()||"ready"}`}><i/>{run?.status||"Ready"}</span></div><p>{source.scope}</p><div className="source-card-meta"><span>{source.note}</span><span>{run?`${run.staged.toLocaleString()} staged last run`:"Not fetched yet"}</span></div></div><button className="btn btn-dark source-import-button" disabled={Boolean(busySource)} onClick={()=>importCatalogue(source)}>{active?<><span className="import-spinner"/>{progress||"Fetching…"}</>:<><Play/>Fetch {source.label}</>}</button></article>})}</div></section>
    <div className="import-stat-grid"><div><DatabaseZap/><span><strong>{candidates.data.length}</strong> sourced records</span></div><div><ScanSearch/><span><strong>{pending}</strong> exceptions</span></div><div><ShieldCheck/><span><strong>{manufacturers}</strong> manufacturers</span></div><div><span className={`run-light ${latest?.status?.toLowerCase()||"idle"}`}/><span><strong>{latest?.status||"READY"}</strong> pipeline status</span></div></div>
    <section className="section import-queue"><div className="section-head"><div><div className="eyebrow">Exception queue</div><h2>Records needing attention</h2></div><span className="queue-count">{visible.length} shown</span></div><div className="import-filters"><label><Search/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search character, maker, series…"/></label><select value={status} onChange={event=>setStatus(event.target.value)}><option value="PENDING">Exceptions</option><option value="">All statuses</option><option value="APPROVED">Published</option><option value="DUPLICATE">Duplicates</option><option value="REJECTED">Rejected</option></select></div>
      <DataState loading={candidates.loading} error={candidates.error} empty={!visible.length} emptyTitle={candidates.data.length?"No exceptions — catalogue is complete":"Catalogue is ready to import"} emptyText={candidates.data.length?"Every sourced record has been handled automatically.":"Choose a provider above to build the catalogue."}><div className="import-candidate-list">{visible.map(item=><article className={`import-candidate card status-${item.status.toLowerCase()}`} key={item.id}><div className="import-scan-rail"/>{item.referenceImageUrl?<div className="candidate-thumb"><Image src={item.referenceImageUrl} alt="" width={100} height={100}/></div>:null}<div className="candidate-identity"><span className={`request-chip ${item.status.toLowerCase()}`}>{item.status}</span><h3>{item.name}</h3><p>{[item.manufacturer,item.character,item.series,item.scale].filter(Boolean).join(" · ")||"Identity fields need verification"}</p><div><span>Source: {item.source}</span><a href={item.sourceUrl} target="_blank" rel="noreferrer">Open source page <ExternalLink/></a></div></div><dl><div><dt>Manufacturer</dt><dd>{item.manufacturer||"Unknown"}</dd></div><div><dt>Character</dt><dd>{item.character||"Unknown"}</dd></div><div><dt>Reference price</dt><dd>{item.sourcePrice&&item.sourceCurrency==="ZAR"?formatZar(item.sourcePrice):item.sourcePrice?`${item.sourceCurrency||""} ${item.sourcePrice.toFixed(2)}`:"—"}</dd></div></dl><div className="candidate-actions">{item.status==="PENDING"?<><Link className="btn btn-primary btn-small" href={`/admin/figures/new?candidate=${item.id}`}>Review &amp; create</Link><button className="btn btn-ghost btn-small" onClick={()=>mark(item,"DUPLICATE")}>Duplicate</button><button className="btn btn-ghost btn-small danger" onClick={()=>mark(item,"REJECTED")}>Reject</button></>:<span>Handled automatically</span>}</div></article>)}</div></DataState>
    </section>
  </div>;
}
