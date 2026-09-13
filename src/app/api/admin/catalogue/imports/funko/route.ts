import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getFirebaseRequestToken, requireFirebaseUser } from "@/lib/firebase-admin";
import { discoverFunkoFigures } from "@/lib/catalogue-import/sites/funko";
import { acquireImportSlot } from "@/lib/catalogue-import/run-control";
import { publishImport } from "@/lib/catalogue-import/publish";
import { importCandidateImages } from "@/lib/catalogue-import/images";

export const runtime="nodejs";export const maxDuration=300;

export async function POST(request:NextRequest){
  let user;
  try{user=await requireFirebaseUser(request)}catch{return NextResponse.json({error:"Unauthorized"},{status:401})}
  const firebaseToken=getFirebaseRequestToken(request);const projectId=process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;if(!firebaseToken||!projectId)return NextResponse.json({error:"Firebase server configuration is incomplete"},{status:500});
  const profileResponse=await fetch(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/users/${encodeURIComponent(user.uid)}`,{headers:{Authorization:`Bearer ${firebaseToken}`},cache:"no-store"});const profile=await profileResponse.json() as {fields?:{role?:{stringValue?:string}}};if(profile.fields?.role?.stringValue!=="ADMIN")return NextResponse.json({error:"Administrator access required"},{status:403});
  const body=await request.json().catch(()=>({})) as {limit?:number};const requestedLimit=Number(body.limit);const limit=Math.max(1,Math.min(Number.isFinite(requestedLimit)&&requestedLimit>0?Math.floor(requestedLimit):25,100));
  const runId=randomUUID();
  try{
    await acquireImportSlot();const result=await discoverFunkoFigures(runId,limit);const candidates=await importCandidateImages(result.candidates);const summary=await publishImport(user.uid,runId,candidates);
    return NextResponse.json({runId,source:"FUNKO",franchise:"Multi-franchise",queries:[result.sitemap],discovered:result.discovered,eligible:result.eligible,staged:candidates.length,...summary,candidates});
  }catch(reason){const message=reason instanceof Error?reason.message:"Import failed";return NextResponse.json({error:message},{status:502})}
}
