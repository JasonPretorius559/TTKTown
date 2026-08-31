import { createHash } from "crypto";
import type { CatalogueCandidate } from "@/types";

const WIKI_ORIGIN="https://hotwheels.fandom.com";
const API_URL=`${WIKI_ORIGIN}/api.php`;

export type HotWheelsWikiRow={toyNumber:string;collectionNumber:string;name:string;series:string;seriesNumber:string;sourceUrl:string;imageUrl:string};

function decodeHtml(value:string){
  return value
    .replace(/&#x([0-9a-f]+);/gi,(_,code)=>String.fromCodePoint(Number.parseInt(code,16)))
    .replace(/&#(\d+);/g,(_,code)=>String.fromCodePoint(Number(code)))
    .replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&nbsp;/g," ");
}
function textOf(html:string){return decodeHtml(html.replace(/<br\s*\/?>/gi," ").replace(/<[^>]+>/g," ")).replace(/\s+/g," ").trim()}
function absoluteWikiUrl(value:string){try{return new URL(decodeHtml(value),WIKI_ORIGIN).toString()}catch{return WIKI_ORIGIN}}

export function parseHotWheelsWikiTable(html:string):HotWheelsWikiRow[]{
  const table=[...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map(match=>match[1]).find(value=>/Toy\s*#/i.test(value)&&/Model Name/i.test(value)&&/Series\s*#/i.test(value));
  if(!table)return [];
  const rows:HotWheelsWikiRow[]=[];
  for(const row of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
    const cells=[...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(match=>match[1]);
    if(cells.length<6)continue;
    const toyNumber=textOf(cells[0]);const name=textOf(cells[2]);const series=textOf(cells[3]);
    if(!/^[A-Z0-9-]{3,20}$/i.test(toyNumber)||!name||!series)continue;
    const modelHref=cells[2].match(/<a\b[^>]*href="([^"]+)"/i)?.[1]||"";
    const rawImage=cells[5].match(/<a\b[^>]*href="(https:\/\/static\.wikia\.nocookie\.net\/[^"]+)"/i)?.[1]||"";
    const imageUrl=/image[_ ]not[_ ]available/i.test(rawImage)?"":decodeHtml(rawImage);
    rows.push({toyNumber,collectionNumber:textOf(cells[1]),name,series,seriesNumber:textOf(cells[4]),sourceUrl:absoluteWikiUrl(modelHref),imageUrl});
  }
  return rows;
}

export async function discoverHotWheelsWikiCollectibles(importRunId:string,limit=300,year=new Date().getUTCFullYear()){
  const pageName=`List of ${year} Hot Wheels`;const pageUrl=`${WIKI_ORIGIN}/wiki/List_of_${year}_Hot_Wheels`;
  const params=new URLSearchParams({action:"parse",page:pageName,prop:"text",format:"json",origin:"*"});
  const response=await fetch(`${API_URL}?${params}`,{headers:{"User-Agent":"TinkerTownCatalogueBot/1.0 (community catalogue import)",Accept:"application/json"},cache:"no-store"});
  if(!response.ok)throw new Error(`Hot Wheels Wiki API returned ${response.status}`);
  const payload=await response.json() as {parse?:{text?:{"*"?:string}};error?:{info?:string}};
  if(payload.error?.info)throw new Error(`Hot Wheels Wiki: ${payload.error.info}`);
  const rows=parseHotWheelsWikiTable(payload.parse?.text?.["*"]||"").slice(0,limit);
  if(!rows.length)throw new Error(`Hot Wheels Wiki did not return a ${year} mainline catalogue`);
  const candidates=rows.map<CatalogueCandidate>(item=>{
    const sourceId=`${year}-${item.toyNumber}`;const fingerprint=createHash("sha256").update(`hot-wheels-wiki|${sourceId.toLowerCase()}`).digest("hex");
    const numberDetail=[`collector #${item.collectionNumber}`,item.seriesNumber&&`series ${item.seriesNumber}`].filter(Boolean).join(" · ");
    return {id:`hotwheelswiki_${fingerprint.slice(0,24)}`,source:"HOT_WHEELS_WIKI",sourceId,sourceUrl:item.sourceUrl||pageUrl,sourceQuery:`Hot Wheels Wiki community catalogue · ${year} mainline`,sourceLicense:"CC BY-SA · Hot Wheels Wiki community content",fingerprint,name:item.name,franchise:"Hot Wheels",character:item.name,manufacturer:"Mattel",series:item.series,scale:"1:64",releaseYear:year,description:`${item.name} from the ${year} Hot Wheels mainline${numberDetail?` · ${numberDetail}`:""} · toy #${item.toyNumber}. Community catalogue data attributed to Hot Wheels Wiki.`,referenceImageUrl:item.imageUrl,status:"PENDING",importRunId};
  });
  return {discovered:rows.length,candidates,pages:[pageUrl]};
}
