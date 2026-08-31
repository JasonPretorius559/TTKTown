import "server-only";
import { put } from "@vercel/blob";
import type { CatalogueCandidate } from "@/types";

const CONTENT_TYPES=new Map([["image/jpeg","jpg"],["image/png","png"],["image/webp","webp"]]);

async function storeCandidateImage(candidate:CatalogueCandidate){
  if(!candidate.referenceImageUrl||candidate.referenceImageUrl.startsWith("/api/blob?"))return candidate;
  try{
    const source=new URL(candidate.referenceImageUrl);if(source.protocol!=="https:")return candidate;
    const response=await fetch(source,{headers:{"User-Agent":"TinkerTown-CatalogueBot/1.0 (+catalogue image import)",Accept:"image/webp,image/png,image/jpeg"},signal:AbortSignal.timeout(15000),cache:"no-store"});
    const contentType=(response.headers.get("content-type")||"").split(";")[0].toLowerCase();const extension=CONTENT_TYPES.get(contentType);const size=Number(response.headers.get("content-length")||0);
    if(!response.ok||!extension||size>4_000_000)return candidate;
    const data=await response.arrayBuffer();if(!data.byteLength||data.byteLength>4_000_000)return candidate;
    const blob=await put(`catalogue/provider-images/${candidate.id}.${extension}`,Buffer.from(data),{access:"private",contentType,addRandomSuffix:false,allowOverwrite:true,cacheControlMaxAge:0});
    return {...candidate,referenceImageUrl:`/api/blob?pathname=${encodeURIComponent(blob.pathname)}`,referenceImagePathname:blob.pathname};
  }catch{return candidate}
}

export async function importCandidateImages(candidates:CatalogueCandidate[]){
  const imported:CatalogueCandidate[]=[];
  for(let offset=0;offset<candidates.length;offset+=5)imported.push(...await Promise.all(candidates.slice(offset,offset+5).map(storeCandidateImage)));
  return imported;
}
