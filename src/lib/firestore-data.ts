"use client";

import { useEffect, useState } from "react";
import {
  DocumentData, QueryConstraint, addDoc, collection, deleteDoc, doc, getDoc, writeBatch,
  limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc, updateDoc, where
} from "firebase/firestore";
import type { WriteBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { planAutomaticApprovals } from "@/lib/catalogue-auto-approval";
import { assertAppropriateContent, assertRecordContent } from "@/lib/content-filter";
import type { CatalogueCandidate, Figure } from "@/types";

export type CommunityFigureInput={
  requesterId:string;requesterUsername:string;name:string;franchise:string;manufacturer:string;notes:string;
  image:string;images:string[];imagePathnames:string[];
};

function catalogueSlug(value:string,suffix:string){
  const base=value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,70)||"community-figure";
  return `${base}-${suffix.toLowerCase()}`;
}

const CATALOGUE_STAGE_BATCH_SIZE=100;
const CATALOGUE_APPROVAL_BATCH_SIZE=50;
const CATALOGUE_BATCH_PAUSE_MS=250;
const RETRYABLE_FIRESTORE_CODES=new Set(["resource-exhausted","unavailable","aborted","deadline-exceeded"]);

function wait(milliseconds:number){return new Promise(resolve=>setTimeout(resolve,milliseconds))}
function firestoreCode(reason:unknown){if(!reason||typeof reason!=="object"||!("code" in reason))return "";return String(reason.code).replace(/^firestore\//,"")}
async function commitCatalogueBatch(firestore:NonNullable<typeof db>,build:(batch:WriteBatch)=>void){
  for(let attempt=0;attempt<5;attempt++){
    const batch=writeBatch(firestore);build(batch);
    try{await batch.commit();return}catch(reason){
      if(!RETRYABLE_FIRESTORE_CODES.has(firestoreCode(reason))||attempt===4)throw reason;
      await wait(Math.min(8000,750*2**attempt)+Math.round(Math.random()*250));
    }
  }
}

export async function createCommunityFigure(input:CommunityFigureInput){
  if(!db)throw new Error("Firebase is not configured");
  assertAppropriateContent([input.requesterUsername,input.name,input.franchise,input.manufacturer,input.notes]);
  const firestore=db;const figureRef=doc(collection(firestore,"figures"));const requestRef=doc(collection(firestore,"figureRequests"));const now=serverTimestamp();
  const slug=catalogueSlug(input.name,figureRef.id.slice(0,7));const batch=writeBatch(firestore);
  batch.set(figureRef,{id:figureRef.id,slug,name:input.name,franchise:input.franchise,character:input.name,manufacturer:input.manufacturer,series:"",scale:"",releaseYear:null,description:input.notes,image:input.image,images:input.images,imagePathnames:input.imagePathnames,owned:0,wanted:0,verificationStatus:"COMMUNITY",moderationStatus:"PENDING",submittedBy:input.requesterId,sourceRequestId:requestRef.id,createdAt:now,updatedAt:now});
  batch.set(requestRef,{id:requestRef.id,requesterId:input.requesterId,requesterUsername:input.requesterUsername,name:input.name,franchise:input.franchise,manufacturer:input.manufacturer,notes:input.notes,status:"PENDING",figureId:figureRef.id,createdAt:now,updatedAt:now});
  await batch.commit();return {figureId:figureRef.id,requestId:requestRef.id,slug};
}

export type QuerySpec = {
  where?: Array<[string, "==" | "array-contains", unknown]>;
  orderBy?: [string, "asc" | "desc"];
  limit?: number;
};

export function useFirestoreCollection<T>(path: string, spec: QuerySpec = {}) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(Boolean(path && db));
  const [error, setError] = useState<string | null>(null);
  const specKey = JSON.stringify(spec);

  useEffect(() => {
    if (!path || !db) return;
    const parsed = JSON.parse(specKey) as QuerySpec;
    const constraints: QueryConstraint[] = [];
    parsed.where?.forEach(([field, operator, value]) => constraints.push(where(field, operator, value)));
    if (parsed.orderBy) constraints.push(orderBy(parsed.orderBy[0], parsed.orderBy[1]));
    if (parsed.limit) constraints.push(limit(parsed.limit));
    const source = constraints.length ? query(collection(db, path), ...constraints) : collection(db, path);
    return onSnapshot(source, snapshot => {
      setData(snapshot.docs.map(item => ({ id:item.id, ...item.data() } as T)));
      setLoading(false); setError(null);
    }, reason => { setError(reason.message); setLoading(false); });
  }, [path, specKey]);

  if (!path) return { data:[] as T[], loading:false, error:null };
  if (!db) return { data:[] as T[], loading:false, error:"Firebase is not configured" };
  return { data, loading, error };
}

export function useFirestoreDocument<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(path && db));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!path || !db) return;
    return onSnapshot(doc(db, path), snapshot => {
      setData(snapshot.exists() ? ({ id:snapshot.id, ...snapshot.data() } as T) : null);
      setLoading(false); setError(null);
    }, reason => { setError(reason.message); setLoading(false); });
  }, [path]);
  if (!path) return { data:null, loading:false, error:null };
  if (!db) return { data:null, loading:false, error:"Firebase is not configured" };
  return { data, loading, error };
}

export async function findOne<T>(path: string, field: string, value: unknown) {
  if (!db) throw new Error("Firebase is not configured");
  const firestore = db;
  return new Promise<T | null>((resolve, reject) => {
    const unsubscribe = onSnapshot(query(collection(firestore, path), where(field, "==", value), limit(1)), snapshot => {
      unsubscribe(); resolve(snapshot.empty ? null : ({ id:snapshot.docs[0].id, ...snapshot.docs[0].data() } as T));
    }, reject);
  });
}

export async function createRecord(path: string, value: DocumentData) {
  if (!db) throw new Error("Firebase is not configured");
  assertRecordContent(value as Record<string,unknown>);
  return addDoc(collection(db, path), { ...value, createdAt:serverTimestamp(), updatedAt:serverTimestamp() });
}

export async function setRecord(path: string, value: DocumentData, merge = true) {
  if (!db) throw new Error("Firebase is not configured");
  assertRecordContent(value as Record<string,unknown>);
  return setDoc(doc(db, path), { ...value, updatedAt:serverTimestamp() }, { merge });
}

export async function updateRecord(path: string, value: DocumentData) {
  if (!db) throw new Error("Firebase is not configured");
  assertRecordContent(value as Record<string,unknown>);
  return updateDoc(doc(db, path), { ...value, updatedAt:serverTimestamp() });
}

export async function removeRecord(path: string) {
  if (!db) throw new Error("Firebase is not configured");
  return deleteDoc(doc(db, path));
}

export async function getRecord<T>(path: string) {
  if (!db) throw new Error("Firebase is not configured");
  const snapshot = await getDoc(doc(db, path));
  return snapshot.exists() ? ({ id:snapshot.id, ...snapshot.data() } as T) : null;
}

export type OwnedFigureInput = {
  figureId:string; condition:string; boxCondition:string; acquisitionType:string; purchasePrice?:number;
  currency:string; acquiredAt?:string; purchasedFrom?:string; notes?:string; isFavourite:boolean; isForSale:boolean;
};

export async function addOwnedFigure(userId:string,value:OwnedFigureInput,collectionIds:string[]=[],removeFromWishlist=false){
  if(!db)throw new Error("Firebase is not configured");
  assertAppropriateContent([value.purchasedFrom,value.notes]);
  const firestore=db;
  const ownedRef=doc(collection(firestore,`users/${userId}/ownedFigures`));
  const batch=writeBatch(firestore);
  const now=serverTimestamp();
  const cleanValue=Object.fromEntries(Object.entries(value).filter(([,fieldValue])=>fieldValue!==undefined));
  batch.set(ownedRef,{...cleanValue,userId,createdAt:now,updatedAt:now});
  collectionIds.forEach((collectionId,index)=>{
    const membershipId=`${collectionId}_${ownedRef.id}`;
    batch.set(doc(firestore,`users/${userId}/collectionFigures/${membershipId}`),{
      userId,collectionId,ownedFigureId:ownedRef.id,figureId:value.figureId,sortOrder:index,
      condition:value.condition,boxCondition:value.boxCondition,isFavourite:value.isFavourite,isForSale:value.isForSale,
      createdAt:now,updatedAt:now
    });
  });
  if(removeFromWishlist)batch.delete(doc(firestore,`users/${userId}/wishlistItems/${value.figureId}`));
  await batch.commit();
  return ownedRef.id;
}

export async function setOwnedFigureFavourite(userId:string,ownedFigureId:string,membershipIds:string[],isFavourite:boolean){
  if(!db)throw new Error("Firebase is not configured");
  const firestore=db;const batch=writeBatch(firestore);const updatedAt=serverTimestamp();
  batch.update(doc(firestore,`users/${userId}/ownedFigures/${ownedFigureId}`),{isFavourite,updatedAt});
  membershipIds.forEach(id=>batch.update(doc(firestore,`users/${userId}/collectionFigures/${id}`),{isFavourite,updatedAt}));
  await batch.commit();
}

export async function stageCatalogueImport(userId:string,run:{id:string;source:CatalogueCandidate["source"];franchise:string;queries:string[];discovered:number},candidates:CatalogueCandidate[],existing:CatalogueCandidate[]){
  if(!db)throw new Error("Firebase is not configured");const firestore=db;const statusById=new Map(existing.map(item=>[item.id,item.status]));const now=serverTimestamp();
  await setDoc(doc(firestore,"catalogueImportRuns",run.id),{id:run.id,source:run.source,franchise:run.franchise,status:"RUNNING",queries:run.queries,discovered:run.discovered,staged:0,createdBy:userId,createdAt:now,updatedAt:now});
  try{
    for(let offset=0;offset<candidates.length;offset+=CATALOGUE_STAGE_BATCH_SIZE){
      const chunk=candidates.slice(offset,offset+CATALOGUE_STAGE_BATCH_SIZE);
      await commitCatalogueBatch(firestore,batch=>chunk.forEach(candidate=>{const preserved=statusById.get(candidate.id);batch.set(doc(firestore,"catalogueCandidates",candidate.id),{...candidate,status:preserved&&preserved!=="PENDING"?preserved:"PENDING",lastSeenAt:serverTimestamp(),createdAt:serverTimestamp(),updatedAt:serverTimestamp()},{merge:true})}));
      if(offset+CATALOGUE_STAGE_BATCH_SIZE<candidates.length)await wait(CATALOGUE_BATCH_PAUSE_MS);
    }
    await updateDoc(doc(firestore,"catalogueImportRuns",run.id),{status:"COMPLETED",staged:candidates.length,completedAt:serverTimestamp(),updatedAt:serverTimestamp()});
  }catch(reason){
    await updateDoc(doc(firestore,"catalogueImportRuns",run.id),{status:"FAILED",error:reason instanceof Error?reason.message:"Catalogue staging failed",updatedAt:serverTimestamp()}).catch(()=>undefined);
    throw reason;
  }
}

export async function autoApproveCatalogueCandidates(actorId:string,candidates:CatalogueCandidate[],figures:Figure[]){
  if(!db)throw new Error("Firebase is not configured");
  const firestore=db;const plan=planAutomaticApprovals(candidates,figures);const now=serverTimestamp();
  const operations:Array<readonly ["approve"|"duplicate",CatalogueCandidate,string,string?,string?]>=[
    ...plan.ready.map(item=>["approve",item.candidate,item.figureId,item.slug,item.imageUrl] as const),
    ...plan.duplicates.map(item=>["duplicate",item.candidate,item.figureId] as const)
  ];
  for(let offset=0;offset<operations.length;offset+=CATALOGUE_APPROVAL_BATCH_SIZE){
    const chunk=operations.slice(offset,offset+CATALOGUE_APPROVAL_BATCH_SIZE);
    await commitCatalogueBatch(firestore,batch=>chunk.forEach(([action,candidate,figureId,slug,imageUrl])=>{
        const candidateRef=doc(firestore,"catalogueCandidates",candidate.id);
        if(action==="duplicate"){
          batch.update(candidateRef,{status:"DUPLICATE",figureId,reviewedBy:actorId,reviewedAt:now,approvalMode:"AUTOMATIC",updatedAt:now});
          return;
        }
        batch.set(doc(firestore,"figures",figureId),{
          id:figureId,slug,name:candidate.name.trim(),franchise:candidate.franchise.trim(),character:candidate.character.trim(),manufacturer:candidate.manufacturer.trim(),
          series:candidate.series.trim(),scale:candidate.scale.trim(),releaseYear:candidate.releaseYear,description:candidate.description.trim(),
          image:imageUrl,images:[imageUrl],imagePathnames:[],owned:0,wanted:0,
          verificationStatus:candidate.source==="HOT_WHEELS_WIKI"||candidate.source==="POKEMON_TCG_WIKI"||candidate.source==="GCD"?"COMMUNITY":"VERIFIED",moderationStatus:"APPROVED",verifiedBy:actorId,verifiedAt:now,approvalMode:"AUTOMATIC",
          sources:[{source:candidate.source,sourceId:candidate.sourceId,sourceUrl:candidate.sourceUrl,...(candidate.sourceLicense?{sourceLicense:candidate.sourceLicense}:{})}],createdAt:now,updatedAt:now
        });
        batch.update(candidateRef,{status:"APPROVED",figureId,reviewedBy:actorId,reviewedAt:now,approvalMode:"AUTOMATIC",updatedAt:now});
      }));
    if(offset+CATALOGUE_APPROVAL_BATCH_SIZE<operations.length)await wait(CATALOGUE_BATCH_PAUSE_MS);
  }
  return {approved:plan.ready.length,duplicates:plan.duplicates.length,held:plan.held.length};
}

export async function setPostLike(postId:string,userId:string,shouldLike:boolean){
  if(!db)throw new Error("Firebase is not configured");
  const firestore=db;const postRef=doc(firestore,"posts",postId);const likeRef=doc(firestore,"posts",postId,"likes",userId);
  return runTransaction(firestore,async transaction=>{
    const [postSnapshot,likeSnapshot]=await Promise.all([transaction.get(postRef),transaction.get(likeRef)]);
    if(!postSnapshot.exists())throw new Error("Post not found");
    const currentCount=Math.max(0,Number(postSnapshot.data().likes||0));
    if(shouldLike){
      if(likeSnapshot.exists())return {liked:true,likeCount:currentCount};
      transaction.set(likeRef,{id:`${postId}_${userId}`,postId,userId,createdAt:serverTimestamp()});
      transaction.update(postRef,{likes:currentCount+1,updatedAt:serverTimestamp()});
      return {liked:true,likeCount:currentCount+1};
    }
    if(!likeSnapshot.exists())return {liked:false,likeCount:currentCount};
    transaction.delete(likeRef);transaction.update(postRef,{likes:Math.max(0,currentCount-1),updatedAt:serverTimestamp()});
    return {liked:false,likeCount:Math.max(0,currentCount-1)};
  });
}
