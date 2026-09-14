import type { Figure } from "@/types";

export type MarketComparable = {
  id:string; title:string; url:string; image:string; price:number; currency:string;
};

export type MarketValueEstimate = {
  provider:"EBAY"; status:"READY"|"INSUFFICIENT_DATA"; figureId:string; query:string;
  marketplace:string; environment:"sandbox"|"production"; currency:string|null;
  estimate:number|null; rangeLow:number|null; rangeHigh:number|null;
  lowest:number|null; highest:number|null; sampleSize:number; asOf:string;
  comparables:MarketComparable[];
};

const GENERIC_QUERY_VALUES=new Set(["trading card","unknown","n/a"]);

export function buildMarketValueQuery(figure:Pick<Figure,"name"|"manufacturer"|"series"|"scale">){
  const values=[figure.name,figure.manufacturer,figure.series,figure.scale]
    .map(value=>value.trim()).filter(value=>value&&!GENERIC_QUERY_VALUES.has(value.toLowerCase()));
  const words:string[]=[];const seen=new Set<string>();
  for(const value of values)for(const word of value.split(/\s+/)){const key=word.toLowerCase();if(!seen.has(key)){seen.add(key);words.push(word)}}
  return words.join(" ").replace(/[^\p{L}\p{N}.'’/&+\- ]/gu," ").replace(/\s+/g," ").trim().slice(0,100).trim();
}

function percentile(sorted:number[],position:number){
  const index=(sorted.length-1)*position;const lower=Math.floor(index);const upper=Math.ceil(index);
  return sorted[lower]+(sorted[upper]-sorted[lower])*(index-lower);
}

export function estimateActiveMarketValue(input:{figureId:string;query:string;marketplace:string;environment:"sandbox"|"production";comparables:MarketComparable[];asOf?:string}):MarketValueEstimate{
  const groups=new Map<string,MarketComparable[]>();
  for(const item of input.comparables){if(!Number.isFinite(item.price)||item.price<=0||!/^[A-Z]{3}$/.test(item.currency))continue;const group=groups.get(item.currency)||[];group.push(item);groups.set(item.currency,group)}
  const selected=[...groups.entries()].sort((a,b)=>b[1].length-a[1].length||a[0].localeCompare(b[0]))[0];
  const currency=selected?.[0]||null;const comparables=(selected?.[1]||[]).sort((a,b)=>a.price-b.price);const prices=comparables.map(item=>item.price);const enough=prices.length>=3;
  return {provider:"EBAY",status:enough?"READY":"INSUFFICIENT_DATA",figureId:input.figureId,query:input.query,marketplace:input.marketplace,environment:input.environment,currency,
    estimate:enough?percentile(prices,.5):null,rangeLow:enough?percentile(prices,.25):null,rangeHigh:enough?percentile(prices,.75):null,
    lowest:prices[0]??null,highest:prices.at(-1)??null,sampleSize:prices.length,asOf:input.asOf||new Date().toISOString(),comparables:comparables.slice(0,6)};
}
