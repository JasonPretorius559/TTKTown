import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getFirebaseRequestToken, requireFirebaseUser } from "@/lib/firebase-admin";
import { discoverTopCollectibles } from "@/lib/catalogue-import/sites/top-collectibles";
import { importCandidateImages } from "@/lib/catalogue-import/images";

export const runtime="nodejs";export const maxDuration=60;

export async function POST(request:NextRequest){
  let user;try{user=await requireFirebaseUser(request)}catch{return NextResponse.json({error:"Unauthorized"},{status:401})}
  const firebaseToken=getFirebaseRequestToken(request);const projectId=process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;if(!firebaseToken||!projectId)return NextResponse.json({error:"Firebase server configuration is incomplete"},{status:500});
  const profileResponse=await fetch(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/users/${encodeURIComponent(user.uid)}`,{headers:{Authorization:`Bearer ${firebaseToken}`},cache:"no-store"});const profile=await profileResponse.json() as {fields?:{role?:{stringValue?:string}}};if(profile.fields?.role?.stringValue!=="ADMIN")return NextResponse.json({error:"Administrator access required"},{status:403});
  const runId=randomUUID();try{const result=await discoverTopCollectibles(runId);const candidates=await importCandidateImages(result.candidates);return NextResponse.json({runId,source:"WEB",franchise:"Multi-franchise",queries:result.sources,discovered:result.discovered,staged:candidates.length,candidates})}catch(reason){return NextResponse.json({error:reason instanceof Error?reason.message:"Import failed"},{status:502})}
}
