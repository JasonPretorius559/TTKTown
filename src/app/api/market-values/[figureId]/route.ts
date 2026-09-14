import {Timestamp} from "firebase-admin/firestore";
import {NextRequest,NextResponse} from "next/server";
import {adminDb,requireFirebaseUser} from "@/lib/firebase-admin";
import {fetchEbayMarketValue} from "@/lib/ebay-market-value";
import type {MarketValueEstimate} from "@/lib/market-value";
import type {Figure} from "@/types";

export const runtime="nodejs";
const CACHE_MS=6*60*60*1000;

type CachedEstimate=MarketValueEstimate&{cachedAt?:Timestamp};

export async function GET(request:NextRequest,{params}:{params:Promise<{figureId:string}>}){
  try{await requireFirebaseUser(request)}catch{return NextResponse.json({error:"Sign in to check market value"},{status:401})}
  const {figureId}=await params;if(!/^[A-Za-z0-9_-]{1,160}$/.test(figureId))return NextResponse.json({error:"Invalid figure"},{status:400});
  const environment=process.env.EBAY_ENVIRONMENT?.toLowerCase()==="sandbox"?"sandbox":"production";const marketplace=process.env.EBAY_MARKETPLACE_ID||"EBAY_US";
  const cacheRef=adminDb.collection("marketEstimates").doc(`ebay_${environment}_${marketplace}_${figureId}`);const cached=await cacheRef.get();const cachedValue=cached.data() as CachedEstimate|undefined;
  if(cachedValue?.cachedAt&&Date.now()-cachedValue.cachedAt.toMillis()<CACHE_MS){const estimate={...cachedValue};delete estimate.cachedAt;return NextResponse.json(estimate)}
  const figureSnapshot=await adminDb.collection("figures").doc(figureId).get();if(!figureSnapshot.exists)return NextResponse.json({error:"Figure not found"},{status:404});
  try{const estimate=await fetchEbayMarketValue({id:figureSnapshot.id,...figureSnapshot.data()} as Figure);await cacheRef.set({...estimate,cachedAt:Timestamp.now()});return NextResponse.json(estimate)}
  catch(reason){return NextResponse.json({error:reason instanceof Error?reason.message:"Market estimate is unavailable"},{status:502})}
}
