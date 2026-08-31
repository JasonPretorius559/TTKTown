import { createHash } from "crypto";
import type { CatalogueCandidate } from "@/types";

const FUNKO_PRODUCT_SITEMAP="https://funko.com/csitemap_product.xml";
const FUNKO_VARIATION_ENDPOINT="https://funko.com/on/demandware.store/Sites-FunkoUS-Site/en_US/Product-Variation";
const FIGURE_MARKERS=/(^|-)pop(-|$)|bitty-pop|vinyl-soda|mystery-mini|wobbler|dorbz|vinyl-idolz|rock-candy|hikari|paka-paka/i;
const NON_FIGURE_MARKERS=/(^|-)(backpack|wallet|handbag|crossbody|keychain|calendar|shirt|tee|hoodie|hat|cap|socks|pin|lanyard|ornament|mug|poster|notebook|sticker|puzzle|game|card-holder)(-|$)/i;
const FRANCHISE_PATTERNS:Array<[RegExp,string]>=[
  [/(^|-)(marvel|avengers|x-men|spider-man|deadpool|venom|daredevil)(-|$)/i,"Marvel"],
  [/(^|-)(dc|batman|superman|wonder-woman|harley-quinn|justice-league)(-|$)/i,"DC"],
  [/(^|-)(star-wars|mandalorian)(-|$)/i,"Star Wars"],
  [/(^|-)(disney|mickey|pixar)(-|$)/i,"Disney"],
  [/(^|-)(pokemon|pikachu)(-|$)/i,"Pokémon"],
  [/(^|-)(harry-potter|wizarding-world)(-|$)/i,"Harry Potter"],
  [/(^|-)(doctor-who|dalek)(-|$)/i,"Doctor Who"],
  [/(^|-)(wwe)(-|$)/i,"WWE"],
  [/(^|-)(stranger-things)(-|$)/i,"Stranger Things"],
  [/(^|-)(tmnt|teenage-mutant-ninja-turtles)(-|$)/i,"Teenage Mutant Ninja Turtles"],
  [/(^|-)(dragon-ball)(-|$)/i,"Dragon Ball"],
  [/(^|-)(naruto)(-|$)/i,"Naruto"],
  [/(^|-)(one-piece)(-|$)/i,"One Piece"],
  [/(^|-)(my-hero-academia)(-|$)/i,"My Hero Academia"],
  [/(^|-)(demon-slayer)(-|$)/i,"Demon Slayer"],
  [/(^|-)(five-nights-at-freddys|fnaf)(-|$)/i,"Five Nights at Freddy's"],
  [/(^|-)(game-of-thrones|got)(-|$)/i,"Game of Thrones"],
  [/(^|-)(lord-of-the-rings|lotr)(-|$)/i,"The Lord of the Rings"],
];

type SitemapEntry={loc:string;lastmod?:string};

function decodeXml(value:string){return value.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'")}
function titleCase(value:string){return value.split(/\s+/).filter(Boolean).map(word=>/^(and|of|the|with)$/i.test(word)?word.toLowerCase():word.charAt(0).toUpperCase()+word.slice(1).toLowerCase()).join(" ")}
function productParts(sourceUrl:string){
  const parts=new URL(sourceUrl).pathname.split("/").filter(Boolean);const sourceId=decodeURIComponent(parts.pop()||"").replace(/\.html$/i,"");const rawSlug=decodeURIComponent(parts.pop()||"").replace(/\//g,"-");
  return {sourceId,slug:rawSlug.replace(/[^a-z0-9-]+/gi,"-").replace(/-+/g,"-").replace(/^-|-$/g,"")};
}
function productName(slug:string){return titleCase(slug.replace(/\bsp-dr\b/gi,"Spider").replace(/\bpop\b/gi,"Pop!").replace(/\bbitty\b/gi,"Bitty").replace(/\bsoda\b/gi,"SODA").replace(/-/g," "))}
function franchiseOf(slug:string){return FRANCHISE_PATTERNS.find(([pattern])=>pattern.test(slug))?.[1]||"Funko"}
function seriesOf(slug:string){
  if(/bitty-pop/i.test(slug))return "Bitty Pop!";
  if(/vinyl-soda/i.test(slug))return "Vinyl SODA";
  if(/mystery-mini/i.test(slug))return "Mystery Minis";
  if(/wobbler/i.test(slug))return "Wobblers";
  if(/dorbz/i.test(slug))return "Dorbz";
  if(/vinyl-idolz/i.test(slug))return "Vinyl Idolz";
  if(/rock-candy/i.test(slug))return "Rock Candy";
  if(/hikari/i.test(slug))return "Hikari";
  if(/paka-paka/i.test(slug))return "Paka Paka";
  return "Pop!";
}
function characterOf(slug:string){
  const cleaned=slug.replace(/^(pop|pop-deluxe|pop-super|pop-jumbo|pocket-pop|bitty-pop|vinyl-soda|mystery-mini|wobbler|dorbz|vinyl-idolz|rock-candy|hikari|paka-paka)-/i,"");const boundary=FRANCHISE_PATTERNS.map(([pattern])=>cleaned.search(pattern)).filter(index=>index>0).sort((a,b)=>a-b)[0]??-1;const value=(boundary>0?cleaned.slice(0,boundary):cleaned).replace(/-with-.*/i,"").replace(/-/g," ");return titleCase(value)||"Unknown";
}
function parseSitemap(xml:string):SitemapEntry[]{
  return [...xml.matchAll(/<url>\s*<loc>([\s\S]*?)<\/loc>(?:\s*<lastmod>([\s\S]*?)<\/lastmod>)?[\s\S]*?<\/url>/gi)].map(match=>({loc:decodeXml(match[1].trim()),...(match[2]?{lastmod:match[2].trim()}:{})}));
}
export function funkoPageMetadata(html:string){
  const meta=(name:string)=>decodeXml(html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`,"i"))?.[1]||html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`,"i"))?.[1]||"");
  return {image:meta("og:image"),description:meta("og:description")};
}
export function funkoVariationImage(html:string){
  const image=html.match(/https:\/\/funko\.com\/dw\/image\/[^"'<>\s]+/i)?.[0]||"";
  return decodeXml(image);
}

export function parseFunkoFigures(xml:string,importRunId:string,limit?:number){
  const entries=parseSitemap(xml);
  const eligible=entries.filter(entry=>{const {slug}=productParts(entry.loc);return FIGURE_MARKERS.test(slug)&&!NON_FIGURE_MARKERS.test(slug)});
  const selected=typeof limit==="number"?eligible.slice(0,Math.max(1,Math.min(Math.floor(limit),eligible.length))):eligible;
  const candidates=selected.map<CatalogueCandidate>(entry=>{
    const {sourceId,slug}=productParts(entry.loc);const fingerprint=createHash("sha256").update(`funko|${sourceId.toLowerCase()}`).digest("hex");const id=`funko_${fingerprint.slice(0,24)}`;const name=productName(slug);const franchise=franchiseOf(slug);const series=seriesOf(slug);
    return {id,source:"FUNKO",sourceId,sourceUrl:entry.loc,sourceQuery:"Funko public product sitemap · All collectible figures",fingerprint,name,franchise,character:characterOf(slug),manufacturer:"Funko",series,scale:"",releaseYear:null,description:`${name} · ${series}. Imported from Funko's public product sitemap; identity and imagery require admin verification.`,referenceImageUrl:"",status:"PENDING",importRunId};
  });
  return {discovered:entries.length,eligible:eligible.length,candidates,sitemap:FUNKO_PRODUCT_SITEMAP};
}

export async function discoverFunkoFigures(importRunId:string,limit?:number){
  const response=await fetch(FUNKO_PRODUCT_SITEMAP,{headers:{"User-Agent":"TinkerTown-CatalogueBot/1.0 (+catalogue review)",Accept:"application/xml,text/xml;q=0.9,*/*;q=0.1"},cache:"no-store"});
  if(!response.ok)throw new Error(`Funko sitemap returned ${response.status}`);
  const result=parseFunkoFigures(await response.text(),importRunId,limit);const metadata=new Map<string,{image:string;description:string}>();
  for(let offset=0;offset<result.candidates.length;offset+=5){
    const pages=await Promise.all(result.candidates.slice(offset,offset+5).map(async candidate=>{try{const url=`${FUNKO_VARIATION_ENDPOINT}?pid=${encodeURIComponent(candidate.sourceId)}`;const page=await fetch(url,{headers:{"User-Agent":"Mozilla/5.0 (compatible; TinkerTown-CatalogueBot/1.0)","X-Requested-With":"XMLHttpRequest",Accept:"text/html,*/*;q=0.1"},signal:AbortSignal.timeout(10000),cache:"no-store"});if(!page.ok)return null;return {id:candidate.id,image:funkoVariationImage(await page.text()),description:""}}catch{return null}}));
    pages.forEach(page=>{if(page?.image)metadata.set(page.id,page)});
  }
  return {...result,candidates:result.candidates.map(candidate=>{const page=metadata.get(candidate.id);return {...candidate,referenceImageUrl:page?.image||candidate.referenceImageUrl,description:page?.description||candidate.description}})};
}

export const discoverFunkoMarvelFigures=discoverFunkoFigures;
