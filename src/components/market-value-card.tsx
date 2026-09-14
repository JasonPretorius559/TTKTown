"use client";
import {ExternalLink,LineChart,Search} from "lucide-react";
import {useState} from "react";
import {useAuth} from "./auth-provider";
import type {MarketValueEstimate} from "@/lib/market-value";
import type {Figure} from "@/types";

function money(value:number|null,currency:string|null){return value===null||!currency?"—":new Intl.NumberFormat("en-ZA",{style:"currency",currency,maximumFractionDigits:2}).format(value)}

export function MarketValueCard({figure}:{figure:Figure}){
  const {user}=useAuth();const [estimate,setEstimate]=useState<MarketValueEstimate|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  const check=async()=>{if(!user||busy)return;setBusy(true);setError("");try{const response=await fetch(`/api/market-values/${encodeURIComponent(figure.id)}`);const payload=await response.json() as MarketValueEstimate&{error?:string};if(!response.ok)throw new Error(payload.error||"Market estimate is unavailable");setEstimate(payload)}catch(reason){setError(reason instanceof Error?reason.message:"Market estimate is unavailable")}finally{setBusy(false)}};
  return <section className="market-value-card card" aria-labelledby="market-value-title"><div className="market-value-heading"><span><LineChart/></span><div><h2 id="market-value-title">eBay market estimate</h2><p>Median active asking price, excluding shipping. This is a guide—not an appraisal or sold-price valuation.</p></div></div>
    {!estimate&&<button className="btn btn-outline" disabled={!user||busy} onClick={check}><Search size={16}/>{busy?"Checking eBay…":user?"Check current value":"Sign in to check value"}</button>}
    {error&&<div className="demo-note" role="alert">{error}</div>}
    {estimate&&<><div className="market-value-result"><div><span>Estimated value</span><strong>{money(estimate.estimate,estimate.currency)}</strong></div><div><span>Typical range</span><strong>{estimate.status==="READY"?`${money(estimate.rangeLow,estimate.currency)} – ${money(estimate.rangeHigh,estimate.currency)}`:"Not enough matches"}</strong></div><div><span>Comparable listings</span><strong>{estimate.sampleSize}</strong></div></div>
      {estimate.environment==="sandbox"&&<div className="demo-note" role="note">Sandbox data is for testing only. Switch the server to production eBay credentials for real market estimates.</div>}
      {estimate.status==="INSUFFICIENT_DATA"&&<p className="meta">At least three same-currency listings are required before TinkerTown states an estimate.</p>}
      {!!estimate.comparables.length&&<div className="market-comparables">{estimate.comparables.map(item=><a href={item.url} target="_blank" rel="noreferrer" key={item.id}><span>{item.title}</span><strong>{money(item.price,item.currency)}</strong><ExternalLink/></a>)}</div>}
      <p className="meta">Source: eBay {estimate.marketplace} · checked {new Date(estimate.asOf).toLocaleString()}</p></>}
  </section>;
}
