import { createHash } from "crypto";
import type { CatalogueCandidate } from "@/types";

const INDEX_URL="https://shop.mattel.com/sitemap.xml";
const COLLECTOR_BRANDS=["hot wheels","matchbox","monster high","masters of the universe","barbie","wwe","jurassic world","disney pixar cars"];
const PRODUCT_MARKERS=/(figure|doll|vehicle|die-cast|diecast|car\b|collectible|miniature)/i;
const EXCLUSIONS=/(track set|playset|dollhouse|game\b|puzzle|shirt|costume|book\b|storage|replacement part)/i;

type SitemapProduct={url:string;image:string;title:string};
function entities(value:string){return value.replace(/&amp;/g,"&").replace(/&apos;|&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,"<").replace(/&gt;/g,">")}
function locs(xml:string){return [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map(match=>entities(match[1].trim()))}
export function parseMattelProducts(xml:string):SitemapProduct[]{
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)].map(block=>({
    url:entities(block[1].match(/<loc>([\s\S]*?)<\/loc>/i)?.[1]?.trim()||""),
    image:entities(block[1].match(/<image:loc>([\s\S]*?)<\/image:loc>/i)?.[1]?.trim()||""),
    title:entities(block[1].match(/<image:title>([\s\S]*?)<\/image:title>/i)?.[1]?.trim()||"")
  })).filter(item=>item.url.includes("/products/")&&item.image&&item.title);
}
function brandOf(value:string){const normalized=value.toLowerCase();return COLLECTOR_BRANDS.find(brand=>normalized.includes(brand))||""}
function displayBrand(value:string){return value.split(" ").map(word=>word==="wwe"?"WWE":word.charAt(0).toUpperCase()+word.slice(1)).join(" ")}
function sourceId(url:string){return new URL(url).pathname.split("/").filter(Boolean).pop()||url}
function scaleOf(title:string){return title.match(/\b(?:1:\d+|\d+(?:\.\d+)?[- ]inch)\b/i)?.[0]||""}

export async function discoverMattelCollectibles(importRunId:string,limit=100){
  const indexResponse=await fetch(INDEX_URL,{headers:{"User-Agent":"TinkerTown-CatalogueBot/1.0 (+official catalogue import)",Accept:"application/xml"},cache:"no-store"});
  if(!indexResponse.ok)throw new Error(`Mattel sitemap returned ${indexResponse.status}`);
  const maps=locs(await indexResponse.text()).filter(url=>/^https:\/\/shop\.mattel\.com\/sitemap_products_\d+\.xml/i.test(url)).reverse();
  const products:SitemapProduct[]=[];
  for(const map of maps){
    const response=await fetch(map,{headers:{"User-Agent":"TinkerTown-CatalogueBot/1.0 (+official catalogue import)",Accept:"application/xml"},cache:"no-store"});
    if(!response.ok)continue;
    for(const item of parseMattelProducts(await response.text())){
      const brand=brandOf(`${item.title} ${item.url}`);if(!brand||!PRODUCT_MARKERS.test(item.title)||EXCLUSIONS.test(item.title))continue;
      products.push(item);if(products.length>=limit)break;
    }
    if(products.length>=limit)break;
  }
  const candidates=products.map<CatalogueCandidate>(item=>{
    const idValue=sourceId(item.url);const fingerprint=createHash("sha256").update(`mattel|${idValue.toLowerCase()}`).digest("hex");const brand=displayBrand(brandOf(`${item.title} ${item.url}`));
    return {id:`mattel_${fingerprint.slice(0,24)}`,source:"MATTEL",sourceId:idValue,sourceUrl:item.url,sourceQuery:"Mattel official live product sitemap · collector products",fingerprint,name:item.title,franchise:brand,character:item.title,manufacturer:"Mattel",series:brand,scale:scaleOf(item.title),releaseYear:null,description:`${item.title}. Official ${brand} product listed by Mattel.`,referenceImageUrl:item.image,status:"PENDING",importRunId};
  });
  return {discovered:products.length,candidates,sitemaps:[INDEX_URL,...maps]};
}
