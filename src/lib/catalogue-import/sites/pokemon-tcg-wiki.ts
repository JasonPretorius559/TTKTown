import { createHash } from "crypto";
import type { CatalogueCandidate } from "@/types";

const WIKI_ORIGIN="https://pokemon.fandom.com";
const API_URL=`${WIKI_ORIGIN}/api.php`;
const OVERVIEW_PAGE="Pokémon Trading Card Game";
const FALLBACK_EXPANSIONS=["Base Set","Expedition"];

export type PokemonExpansion={name:string;pageTitle:string;sourceUrl:string;releaseYear:number|null};
export type PokemonCardRow={number:string;name:string;type:string;rarity:string;sourceUrl:string};

function decodeHtml(value:string){
  return value.replace(/&#x([0-9a-f]+);/gi,(_,code)=>String.fromCodePoint(Number.parseInt(code,16))).replace(/&#(\d+);/g,(_,code)=>String.fromCodePoint(Number(code))).replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&nbsp;/g," ");
}
function textOf(html:string){return decodeHtml(html.replace(/<br\s*\/?>/gi," ").replace(/<[^>]+>/g," ")).replace(/\s+/g," ").trim()}
function absoluteWikiUrl(value:string){try{return new URL(decodeHtml(value),WIKI_ORIGIN).toString()}catch{return WIKI_ORIGIN}}
function pageTitleFromUrl(value:string){try{return decodeURIComponent(new URL(value,WIKI_ORIGIN).pathname.replace(/^\/wiki\//,"")).replace(/_/g," ")}catch{return value}}
function tableCells(row:string){return [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(match=>match[1])}

export function parsePokemonExpansionLinks(html:string):PokemonExpansion[]{
  const expansions:PokemonExpansion[]=[];const seen=new Set<string>();
  for(const table of html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)){
    if(!/Set Name/i.test(table[1])||!/Release Date/i.test(table[1]))continue;
    for(const row of table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
      const cells=tableCells(row[1]);if(cells.length<5)continue;
      const link=cells[2].match(/<a\b[^>]*href="([^"]+)"/i);if(!link)continue;
      const name=textOf(cells[2]);const sourceUrl=absoluteWikiUrl(link[1]);const pageTitle=pageTitleFromUrl(sourceUrl);const year=Number(textOf(cells[4]).match(/\b(19|20)\d{2}\b/)?.[0]||0)||null;
      if(!name||seen.has(pageTitle))continue;seen.add(pageTitle);expansions.push({name,pageTitle,sourceUrl,releaseYear:year});
    }
  }
  return expansions;
}

export function parsePokemonCardTable(html:string,setUrl:string):PokemonCardRow[]{
  const cards:PokemonCardRow[]=[];
  for(const table of html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)){
    if(!/<th\b[^>]*>\s*(?:№|No\.?|#)/i.test(table[1])||!/<th\b[^>]*>\s*Name/i.test(table[1]))continue;
    for(const row of table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
      const cells=tableCells(row[1]);if(cells.length<2)continue;
      const number=textOf(cells[0]);const name=textOf(cells[1]);if(!number||!name||!/\d/.test(number))continue;
      const href=cells[1].match(/<a\b[^>]*href="([^"]+)"/i)?.[1]||"";
      cards.push({number,name,type:textOf(cells[2]||""),rarity:textOf(cells[3]||""),sourceUrl:href?absoluteWikiUrl(href):setUrl});
    }
  }
  return cards;
}

async function fetchParsedPage(page:string){
  const params=new URLSearchParams({action:"parse",page,prop:"text",format:"json",origin:"*"});
  const response=await fetch(`${API_URL}?${params}`,{headers:{"User-Agent":"TinkerTownCatalogueBot/1.0 (community catalogue import)",Accept:"application/json"},cache:"no-store"});
  if(!response.ok)throw new Error(`Pokémon Wiki API returned ${response.status}`);
  const payload=await response.json() as {parse?:{text?:{"*"?:string}};error?:{info?:string}};
  if(payload.error?.info)throw new Error(`Pokémon Wiki: ${payload.error.info}`);
  return payload.parse?.text?.["*"]||"";
}

async function fetchPageImages(pageTitles:string[]){
  const images=new Map<string,string>();
  for(let offset=0;offset<pageTitles.length;offset+=25){
    const titles=[...new Set(pageTitles.slice(offset,offset+25))];const params=new URLSearchParams({action:"query",prop:"pageimages",piprop:"thumbnail",pithumbsize:"900",redirects:"1",titles:titles.join("|"),format:"json",origin:"*"});
    try{const response=await fetch(`${API_URL}?${params}`,{headers:{"User-Agent":"TinkerTownCatalogueBot/1.0 (community catalogue image import)",Accept:"application/json"},cache:"no-store"});if(!response.ok)continue;const payload=await response.json() as PokemonPageImagesResponse;for(const [title,image] of pokemonPageImages(payload))images.set(title,image)}catch{}
  }
  return images;
}

type PokemonPageImagesResponse={query?:{normalized?:Array<{from:string;to:string}>;redirects?:Array<{from:string;to:string}>;pages?:Record<string,{title?:string;thumbnail?:{source?:string}}>}};

export function pokemonPageImages(payload:PokemonPageImagesResponse){
  const aliases=new Map<string,string>();
  payload.query?.normalized?.forEach(item=>aliases.set(item.from,item.to));
  payload.query?.redirects?.forEach(item=>aliases.set(item.from,item.to));
  const resolved=(title:string)=>{const seen=new Set<string>();while(aliases.has(title)&&!seen.has(title)){seen.add(title);title=aliases.get(title)!}return title};
  const byTitle=new Map<string,string>();
  Object.values(payload.query?.pages||{}).forEach(page=>{if(page.title&&page.thumbnail?.source)byTitle.set(page.title,page.thumbnail.source)});
  const images=new Map(byTitle);
  aliases.forEach((_,from)=>{const image=byTitle.get(resolved(from));if(image)images.set(from,image)});
  return images;
}

export async function discoverPokemonTcgWikiCollectibles(importRunId:string,limit=300){
  const overviewHtml=await fetchParsedPage(OVERVIEW_PAGE);const overviewUrl=`${WIKI_ORIGIN}/wiki/Pok%C3%A9mon_Trading_Card_Game`;
  const listed=parsePokemonExpansionLinks(overviewHtml);const newest=listed.slice(-8).reverse();
  const fallback=FALLBACK_EXPANSIONS.map(pageTitle=>listed.find(item=>item.pageTitle===pageTitle)||{name:pageTitle,pageTitle,sourceUrl:`${WIKI_ORIGIN}/wiki/${encodeURIComponent(pageTitle.replace(/ /g,"_"))}`,releaseYear:null});
  const expansions=[...newest,...fallback.filter(item=>!newest.some(current=>current.pageTitle===item.pageTitle))];
  const pages=await Promise.all(expansions.map(async expansion=>({expansion,html:await fetchParsedPage(expansion.pageTitle).catch(()=>"")})));
  const discovered:{card:PokemonCardRow;expansion:PokemonExpansion}[]=[];
  for(const page of pages){for(const card of parsePokemonCardTable(page.html,page.expansion.sourceUrl)){discovered.push({card,expansion:page.expansion});if(discovered.length>=limit)break}if(discovered.length>=limit)break}
  if(!discovered.length)throw new Error("Pokémon Wiki did not return any documented TCG cards");
  const pageTitles=discovered.map(({card})=>pageTitleFromUrl(card.sourceUrl));const pageImages=await fetchPageImages(pageTitles);
  const candidates=discovered.map<CatalogueCandidate>(({card,expansion})=>{
    const sourceId=`${expansion.pageTitle}|${card.number}`;const fingerprint=createHash("sha256").update(`pokemon-tcg-wiki|${sourceId.toLowerCase()}`).digest("hex");const detail=[card.type&&`${card.type} type`,card.rarity&&`${card.rarity} rarity`].filter(Boolean).join(" · ");
    return {id:`pokemontcg_${fingerprint.slice(0,24)}`,source:"POKEMON_TCG_WIKI",sourceId,sourceUrl:card.sourceUrl||expansion.sourceUrl,sourceQuery:`Pokémon Wiki community catalogue · ${expansion.name}`,sourceLicense:"CC BY-SA · Pokémon Wiki community content",fingerprint,name:`${card.name} ${card.number}`,franchise:"Pokémon Trading Card Game",character:card.name,manufacturer:"The Pokémon Company",series:expansion.name,scale:"Trading Card",releaseYear:expansion.releaseYear,description:`${card.name}, card ${card.number} from the ${expansion.name} expansion${detail?` · ${detail}`:""}. Community catalogue data attributed to Pokémon Wiki.`,referenceImageUrl:pageImages.get(pageTitleFromUrl(card.sourceUrl))||"",status:"PENDING",importRunId};
  });
  return {discovered:discovered.length,candidates,pages:[overviewUrl,...expansions.map(item=>item.sourceUrl)]};
}
