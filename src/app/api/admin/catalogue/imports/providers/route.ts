import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getFirebaseRequestToken, requireFirebaseUser } from "@/lib/firebase-admin";
import { discoverMattelCollectibles } from "@/lib/catalogue-import/sites/mattel";
import { discoverMcFarlaneCollectibles } from "@/lib/catalogue-import/sites/mcfarlane";
import { discoverHotWheelsWikiCollectibles } from "@/lib/catalogue-import/sites/hot-wheels-wiki";
import { discoverPokemonTcgWikiCollectibles } from "@/lib/catalogue-import/sites/pokemon-tcg-wiki";
import { discoverGrandComicsDatabaseCollectibles } from "@/lib/catalogue-import/sites/grand-comics-database";
import { importCandidateImages } from "@/lib/catalogue-import/images";

export const runtime="nodejs";export const maxDuration=60;
type Provider="MATTEL"|"MCFARLANE"|"HOT_WHEELS_WIKI"|"POKEMON_TCG_WIKI"|"GCD";

export async function POST(request:NextRequest){
  let user;try{user=await requireFirebaseUser(request)}catch{return NextResponse.json({error:"Unauthorized"},{status:401})}
  const firebaseToken=getFirebaseRequestToken(request);const projectId=process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;if(!firebaseToken||!projectId)return NextResponse.json({error:"Firebase server configuration is incomplete"},{status:500});
  const profileResponse=await fetch(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/users/${encodeURIComponent(user.uid)}`,{headers:{Authorization:`Bearer ${firebaseToken}`},cache:"no-store"});const profile=await profileResponse.json() as {fields?:{role?:{stringValue?:string}}};if(profile.fields?.role?.stringValue!=="ADMIN")return NextResponse.json({error:"Administrator access required"},{status:403});
  const body=await request.json().catch(()=>({})) as {provider?:Provider;limit?:number};const provider=body.provider;const limit=Math.max(1,Math.min(Number(body.limit)||25,provider==="MCFARLANE"?25:100));if(provider!=="MATTEL"&&provider!=="MCFARLANE"&&provider!=="HOT_WHEELS_WIKI"&&provider!=="POKEMON_TCG_WIKI"&&provider!=="GCD")return NextResponse.json({error:"Choose a supported provider"},{status:400});
  const runId=randomUUID();try{
    const result=provider==="MATTEL"?await discoverMattelCollectibles(runId,limit):provider==="MCFARLANE"?await discoverMcFarlaneCollectibles(runId,limit):provider==="HOT_WHEELS_WIKI"?await discoverHotWheelsWikiCollectibles(runId,limit):provider==="POKEMON_TCG_WIKI"?await discoverPokemonTcgWikiCollectibles(runId,limit):await discoverGrandComicsDatabaseCollectibles(runId,limit);const candidates=await importCandidateImages(result.candidates);
    const queries="sitemaps" in result?result.sitemaps:"sitemap" in result?[result.sitemap]:result.pages;
    return NextResponse.json({runId,source:provider,franchise:provider==="HOT_WHEELS_WIKI"?"Hot Wheels":provider==="POKEMON_TCG_WIKI"?"Pokémon Trading Card Game":"Multi-franchise",queries,discovered:result.discovered,staged:candidates.length,candidates});
  }catch(reason){return NextResponse.json({error:reason instanceof Error?reason.message:"Provider import failed"},{status:502})}
}
