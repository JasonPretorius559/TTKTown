import { createHash } from "crypto";
import type { CatalogueCandidate } from "@/types";

const sandbox=process.env.EBAY_ENVIRONMENT?.toLowerCase()==="sandbox";
const EBAY_TOKEN_URL=sandbox?"https://api.sandbox.ebay.com/identity/v1/oauth2/token":"https://api.ebay.com/identity/v1/oauth2/token";
const EBAY_SEARCH_URL=sandbox?"https://api.sandbox.ebay.com/buy/browse/v1/item_summary/search":"https://api.ebay.com/buy/browse/v1/item_summary/search";

export const MARVEL_IMPORT_QUERIES=[
  "Marvel Legends action figure",
  "Marvel Hot Toys 1/6 figure",
  "Marvel Funko Pop figure",
  "Marvel S.H.Figuarts figure",
  "Marvel Kotobukiya statue"
];

type EbayAspect={name?:string;value?:string};
type EbayItem={
  itemId?:string;title?:string;itemWebUrl?:string;image?:{imageUrl?:string};
  price?:{value?:string;currency?:string};localizedAspects?:EbayAspect[];
};
type EbaySearchResponse={itemSummaries?:EbayItem[];next?:string};

function aspect(item:EbayItem,...names:string[]){const wanted=names.map(name=>name.toLowerCase());return item.localizedAspects?.find(entry=>wanted.includes(entry.name?.toLowerCase()||""))?.value?.trim()||""}
function compactTitle(title:string){return title.replace(/\b(new|sealed|boxed|loose|mint|complete|official|authentic|in hand|pre[- ]?order)\b/gi," ").replace(/\s+/g," ").replace(/[|]+/g,"-").trim()}
function fingerprint(item:EbayItem){const title=compactTitle(item.title||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();const identity=[aspect(item,"Brand","Manufacturer"),aspect(item,"Character"),aspect(item,"Movie","TV Show","Series"),aspect(item,"Scale"),title].join("|").toLowerCase();return identity}
function candidateId(value:string){return createHash("sha256").update(value).digest("hex").slice(0,28)}
function yearOf(item:EbayItem){const raw=aspect(item,"Year Manufactured","Release Year","Year");const match=raw.match(/(?:19|20)\d{2}/);return match?Number(match[0]):null}

export async function getEbayApplicationToken(){
  const clientId=process.env.EBAY_CLIENT_ID;const clientSecret=process.env.EBAY_CLIENT_SECRET;
  if(!clientId||!clientSecret)throw new Error("EBAY_CLIENT_ID and EBAY_CLIENT_SECRET are required");
  const response=await fetch(EBAY_TOKEN_URL,{method:"POST",headers:{Authorization:`Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"client_credentials",scope:"https://api.ebay.com/oauth/api_scope"}),cache:"no-store"});
  if(!response.ok)throw new Error(`eBay authentication failed (${response.status})`);
  const payload=await response.json() as {access_token?:string};if(!payload.access_token)throw new Error("eBay did not return an access token");return payload.access_token;
}

export async function discoverMarvelFigures(importRunId:string,pagesPerQuery=1){
  const token=await getEbayApplicationToken();const marketplace=process.env.EBAY_MARKETPLACE_ID||"EBAY_US";const candidates=new Map<string,CatalogueCandidate>();let discovered=0;
  for(const sourceQuery of MARVEL_IMPORT_QUERIES){
    let nextUrl=`${EBAY_SEARCH_URL}?${new URLSearchParams({q:sourceQuery,limit:"50",filter:"buyingOptions:{FIXED_PRICE|AUCTION}"})}`;
    for(let page=0;page<Math.max(1,Math.min(pagesPerQuery,4))&&nextUrl;page++){
      const response=await fetch(nextUrl,{headers:{Authorization:`Bearer ${token}`,"X-EBAY-C-MARKETPLACE-ID":marketplace},cache:"no-store"});
      if(!response.ok)throw new Error(`eBay search failed for ${sourceQuery} (${response.status})`);
      const payload=await response.json() as EbaySearchResponse;const items=payload.itemSummaries||[];discovered+=items.length;
      for(const item of items){if(!item.itemId||!item.title||!item.itemWebUrl)continue;const key=fingerprint(item);if(!key)continue;const id=candidateId(`MARVEL|${key}`);const manufacturer=aspect(item,"Brand","Manufacturer");const character=aspect(item,"Character");const series=aspect(item,"Movie","TV Show","Series","Theme");const scale=aspect(item,"Scale");const price=Number(item.price?.value);
        candidates.set(id,{id,source:"EBAY",sourceId:item.itemId,sourceUrl:item.itemWebUrl,sourceQuery,fingerprint:key,name:compactTitle(item.title),franchise:"Marvel",character,manufacturer,series,scale,releaseYear:yearOf(item),description:[manufacturer,character,series,scale].filter(Boolean).join(" · "),referenceImageUrl:item.image?.imageUrl||"",...(Number.isFinite(price)?{sourcePrice:price}:{}),...(item.price?.currency?{sourceCurrency:item.price.currency}:{}),status:"PENDING",importRunId});
      }
      nextUrl=payload.next||"";
    }
  }
  return {candidates:[...candidates.values()],discovered};
}
