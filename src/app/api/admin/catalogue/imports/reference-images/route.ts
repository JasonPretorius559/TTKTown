import { NextRequest, NextResponse } from "next/server";
import { getFirebaseRequestToken, requireFirebaseUser } from "@/lib/firebase-admin";

export const runtime="nodejs";export const maxDuration=60;

type ImageMapping={id:string;url:string};

export async function POST(request:NextRequest){
  let user;try{user=await requireFirebaseUser(request)}catch{return NextResponse.json({error:"Unauthorized"},{status:401})}
  const firebaseToken=getFirebaseRequestToken(request);const projectId=process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;if(!firebaseToken||!projectId)return NextResponse.json({error:"Firebase server configuration is incomplete"},{status:500});
  const profileResponse=await fetch(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/users/${encodeURIComponent(user.uid)}`,{headers:{Authorization:`Bearer ${firebaseToken}`},cache:"no-store"});const profile=await profileResponse.json() as {fields?:{role?:{stringValue?:string}}};if(profile.fields?.role?.stringValue!=="ADMIN")return NextResponse.json({error:"Administrator access required"},{status:403});
  const body=await request.json().catch(()=>({})) as {images?:ImageMapping[]};const images=(body.images||[]).filter(item=>/^funko_[a-f0-9]{24}$/.test(item.id)&&isAllowedImage(item.url)).slice(0,300);if(!images.length)return NextResponse.json({error:"No valid image mappings supplied"},{status:400});
  const now=new Date().toISOString();const database=`projects/${projectId}/databases/(default)`;let updated=0;
  for(let offset=0;offset<images.length;offset+=10){const results=await Promise.all(images.slice(offset,offset+10).map(async item=>{const endpoint=`https://firestore.googleapis.com/v1/${database}/documents/catalogueCandidates/${encodeURIComponent(item.id)}?updateMask.fieldPaths=referenceImageUrl&updateMask.fieldPaths=updatedAt&currentDocument.exists=true`;const response=await fetch(endpoint,{method:"PATCH",headers:{Authorization:`Bearer ${firebaseToken}`,"Content-Type":"application/json"},body:JSON.stringify({fields:{referenceImageUrl:{stringValue:item.url},updatedAt:{timestampValue:now}}}),cache:"no-store"});return {ok:response.ok,status:response.status,detail:response.ok?"":await response.text()}}));const failure=results.find(result=>!result.ok);if(failure)return NextResponse.json({error:`Firestore image update failed after ${updated} records: ${failure.status}`,detail:failure.detail},{status:502});updated+=results.length}
  return NextResponse.json({updated});
}

function isAllowedImage(value:string){try{const url=new URL(value);return url.protocol==="https:"&&(url.hostname==="funko.com"||url.hostname.endsWith(".funko.com"))&&url.pathname.includes("/on/demandware.static/")}catch{return false}}
