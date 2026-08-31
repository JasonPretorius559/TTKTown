import { createHash, createVerify } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getEbayApplicationToken } from "@/lib/catalogue-import/ebay";

export const runtime="nodejs";export const dynamic="force-dynamic";

type SignatureEnvelope={kid?:string;signature?:string};
type DeletionNotification={
  metadata?:{topic?:string;schemaVersion?:string};
  notification?:{notificationId?:string;eventDate?:string;publishDate?:string;publishAttemptCount?:number;data?:{username?:string;userId?:string;eiasToken?:string}};
};
type CachedKey={key:string;expiresAt:number};

const publicKeyCache=new Map<string,CachedKey>();

function endpointConfig(){
  const endpoint=process.env.EBAY_DELETION_ENDPOINT_URL?.trim();const verificationToken=process.env.EBAY_DELETION_VERIFICATION_TOKEN?.trim();
  if(!endpoint||!endpoint.startsWith("https://"))throw new Error("EBAY_DELETION_ENDPOINT_URL must be the exact public HTTPS callback URL");
  if(!verificationToken||verificationToken.length<32||verificationToken.length>80||!/^[A-Za-z0-9_-]+$/.test(verificationToken))throw new Error("EBAY_DELETION_VERIFICATION_TOKEN must contain 32–80 allowed characters");
  return {endpoint,verificationToken};
}

function challengeResponse(challengeCode:string){const {endpoint,verificationToken}=endpointConfig();return createHash("sha256").update(challengeCode).update(verificationToken).update(endpoint).digest("hex")}
function decodeSignature(value:string){try{return JSON.parse(Buffer.from(value,"base64").toString("ascii")) as SignatureEnvelope}catch{throw new Error("Invalid X-EBAY-SIGNATURE header")}}
function formatPublicKey(value:string){return value.replace(/-----BEGIN PUBLIC KEY-----\s*/,"-----BEGIN PUBLIC KEY-----\n").replace(/\s*-----END PUBLIC KEY-----/,"\n-----END PUBLIC KEY-----")}

async function publicKey(keyId:string){
  const cached=publicKeyCache.get(keyId);if(cached&&cached.expiresAt>Date.now())return cached.key;
  const environment=process.env.EBAY_ENVIRONMENT?.toLowerCase()==="sandbox"?"https://api.sandbox.ebay.com":"https://api.ebay.com";const token=await getEbayApplicationToken();
  const response=await fetch(`${environment}/commerce/notification/v1/public_key/${encodeURIComponent(keyId)}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});if(!response.ok)throw new Error(`Could not retrieve eBay notification public key (${response.status})`);
  const payload=await response.json() as {key?:string};if(!payload.key)throw new Error("eBay public-key response did not contain a key");const key=formatPublicKey(payload.key);publicKeyCache.set(keyId,{key,expiresAt:Date.now()+60*60*1000});return key;
}

async function validSignature(message:DeletionNotification,header:string){const envelope=decodeSignature(header);if(!envelope.kid||!envelope.signature)throw new Error("Incomplete eBay signature envelope");const verifier=createVerify("sha1");verifier.update(JSON.stringify(message));verifier.end();return verifier.verify(await publicKey(envelope.kid),envelope.signature,"base64")}

export async function GET(request:NextRequest){
  const challengeCode=request.nextUrl.searchParams.get("challenge_code");if(!challengeCode)return NextResponse.json({error:"Missing challenge_code"},{status:400});
  try{return NextResponse.json({challengeResponse:challengeResponse(challengeCode)},{status:200,headers:{"Cache-Control":"no-store"}})}catch(reason){return NextResponse.json({error:reason instanceof Error?reason.message:"Endpoint is not configured"},{status:503})}
}

export async function POST(request:NextRequest){
  const signature=request.headers.get("x-ebay-signature");if(!signature)return new NextResponse(null,{status:412});
  let message:DeletionNotification;try{message=JSON.parse(await request.text()) as DeletionNotification}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
  if(message.metadata?.topic!=="MARKETPLACE_ACCOUNT_DELETION"||!message.notification?.notificationId)return NextResponse.json({error:"Unsupported notification"},{status:400});
  try{if(!await validSignature(message,signature))return new NextResponse(null,{status:412})}catch{return new NextResponse(null,{status:503})}
  // TinkerTown stores listing IDs and catalogue metadata, not eBay usernames, user IDs, EIAS tokens, or seller profiles.
  // Therefore there is currently no persisted eBay personal data to delete. Do not log or retain message.notification.data.
  console.info("Acknowledged verified eBay account deletion notification",{notificationId:message.notification.notificationId,topic:message.metadata.topic});
  return new NextResponse(null,{status:204});
}
