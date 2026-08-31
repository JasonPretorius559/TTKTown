import { createHash } from "crypto";
import type { CatalogueCandidate } from "@/types";

const SITEMAP_URL="https://mcfarlanetoysstore.com/xmlsitemap.php?type=products&page=1";
const PRODUCT_MARKERS=/(figure|statue|bust|collectible)/i;
const EXCLUSIONS=/(t-shirt|shirt|comic|pin\b|case of|factory case|bundle|accessory pack|collector box)/i;

function entities(value:string){return value.replace(/&amp;/g,"&").replace(/&apos;|&#39;|&#x27;/gi,"'").replace(/&quot;|&#x22;/gi,'"').replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/<[^>]+>/g,"").trim()}
function meta(html:string,name:string){const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");return entities(html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`,"i"))?.[1]||html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`,"i"))?.[1]||"")}
function franchiseOf(value:string){const lanes=[["DC","DC"],["Batman","DC"],["Superman","DC"],["Spawn","Spawn"],["NFL","NFL"],["NHL","NHL"],["MLB","MLB"],["NBA","NBA"],["Mortal Kombat","Mortal Kombat"],["Game of Thrones","Game of Thrones"],["Transformers","Transformers"]] as const;return lanes.find(([needle])=>value.toLowerCase().includes(needle.toLowerCase()))?.[1]||"McFarlane Toys"}
function seriesOf(value:string){if(/dc multiverse/i.test(value))return "DC Multiverse";if(/sportspicks|nfl|nhl|mlb|nba/i.test(value))return "McFarlane's Sportspicks";if(/spawn/i.test(value))return "Spawn";return "McFarlane Toys"}
function scaleOf(value:string){return value.match(/\b(?:\d+(?:\.\d+)?(?:in|[- ]inch)|1:\d+)\b/i)?.[0]||""}

export async function discoverMcFarlaneCollectibles(importRunId:string,limit=50){
  const response=await fetch(SITEMAP_URL,{headers:{"User-Agent":"TinkerTown-CatalogueBot/1.0 (+official catalogue import)",Accept:"application/xml"},cache:"no-store"});
  if(!response.ok)throw new Error(`McFarlane sitemap returned ${response.status}`);
  const urls=[...(await response.text()).matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map(match=>entities(match[1])).filter(url=>PRODUCT_MARKERS.test(url)&&!EXCLUSIONS.test(url)).slice(0,limit);
  const pages=[] as Array<{url:string;title:string;image:string;description:string}>;
  for(let offset=0;offset<urls.length;offset+=8){
    const batch=await Promise.all(urls.slice(offset,offset+8).map(async url=>{try{const page=await fetch(url,{headers:{"User-Agent":"TinkerTown-CatalogueBot/1.0 (+official catalogue import)",Accept:"text/html"},signal:AbortSignal.timeout(12000),cache:"no-store"});if(!page.ok)return null;const html=await page.text();return {url,title:meta(html,"og:title"),image:meta(html,"og:image"),description:meta(html,"og:description")}}catch{return null}}));
    pages.push(...batch.filter((item):item is NonNullable<typeof item>=>Boolean(item?.title&&item.image)));
  }
  const candidates=pages.map<CatalogueCandidate>(item=>{const slug=new URL(item.url).pathname.split("/").filter(Boolean).pop()||item.title;const fingerprint=createHash("sha256").update(`mcfarlane|${slug.toLowerCase()}`).digest("hex");const franchise=franchiseOf(`${item.title} ${item.url}`);
    return {id:`mcfarlane_${fingerprint.slice(0,24)}`,source:"MCFARLANE",sourceId:slug,sourceUrl:item.url,sourceQuery:"McFarlane Toys official product sitemap · figures and statues",fingerprint,name:item.title,franchise,character:item.title,manufacturer:"McFarlane Toys",series:seriesOf(`${item.title} ${item.url}`),scale:scaleOf(item.title),releaseYear:null,description:item.description||`${item.title}. Official McFarlane Toys product.`,referenceImageUrl:item.image,status:"PENDING",importRunId};
  });
  return {discovered:urls.length,candidates,sitemap:SITEMAP_URL};
}
