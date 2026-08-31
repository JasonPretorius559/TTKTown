"use client";

import { collection, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/firebase";
import type { FigureRequest } from "@/types";

export type CatalogueFigureInput={name:string;slug:string;franchise:string;character:string;manufacturer:string;series:string;scale:string;releaseYear:number;description:string;image:string;images:string[];imagePathnames:string[]};

export async function approveFigureRequest(requestId:string,actorId:string,input:CatalogueFigureInput){
  if(!db)throw new Error("Firebase is not configured");const firestore=db;const requestRef=doc(firestore,"figureRequests",requestId);const auditRef=doc(firestore,"auditLogs",`catalogue_approved_${requestId}`);let approvedFigureId="";
  await runTransaction(firestore,async transaction=>{const snapshot=await transaction.get(requestRef);if(!snapshot.exists())throw new Error("Catalogue request not found.");const request=snapshot.data() as FigureRequest;if(request.status!=="PENDING")throw new Error(`This request is already ${request.status.toLowerCase()}.`);approvedFigureId=request.figureId||doc(collection(firestore,"figures")).id;const figureRef=doc(firestore,"figures",approvedFigureId);transaction.set(figureRef,{id:approvedFigureId,...input,owned:0,wanted:0,verificationStatus:"VERIFIED",moderationStatus:"APPROVED",verifiedBy:actorId,verifiedAt:serverTimestamp(),updatedAt:serverTimestamp()},{merge:true});transaction.update(requestRef,{status:"APPROVED",figureId:approvedFigureId,reviewedBy:actorId,reviewedAt:serverTimestamp(),updatedAt:serverTimestamp()});transaction.set(doc(firestore,`users/${request.requesterId}/notifications/catalogue_${requestId}`),{id:`catalogue_${requestId}`,targetUserId:request.requesterId,type:"CATALOGUE_APPROVED",title:"Community figure verified",body:`${input.name} has been verified without changing your collection or listings.`,href:`/figures/${input.slug}`,read:false,time:"Just now",createdAt:serverTimestamp()});transaction.set(auditRef,{id:auditRef.id,action:"CATALOGUE_REQUEST_APPROVED",actorId,targetId:requestId,figureId:approvedFigureId,createdAt:serverTimestamp()})});return {figureId:approvedFigureId,slug:input.slug};
}

export async function rejectFigureRequest(requestId:string,actorId:string,reason:string){
  if(!db)throw new Error("Firebase is not configured");const firestore=db;const requestRef=doc(firestore,"figureRequests",requestId);const auditRef=doc(firestore,"auditLogs",`catalogue_rejected_${requestId}`);
  await runTransaction(firestore,async transaction=>{const snapshot=await transaction.get(requestRef);if(!snapshot.exists())throw new Error("Catalogue request not found.");const request=snapshot.data() as FigureRequest;if(request.status!=="PENDING")throw new Error(`This request is already ${request.status.toLowerCase()}.`);transaction.update(requestRef,{status:"REJECTED",reviewReason:reason.trim().slice(0,500),reviewedBy:actorId,reviewedAt:serverTimestamp(),updatedAt:serverTimestamp()});if(request.figureId)transaction.update(doc(firestore,"figures",request.figureId),{moderationStatus:"REJECTED",reviewReason:reason.trim().slice(0,500),updatedAt:serverTimestamp()});transaction.set(doc(firestore,`users/${request.requesterId}/notifications/catalogue_${requestId}`),{id:`catalogue_${requestId}`,targetUserId:request.requesterId,type:"CATALOGUE_REJECTED",title:"Community figure needs changes",body:reason.trim().slice(0,140),href:"/marketplace/sell?mode=request",read:false,time:"Just now",createdAt:serverTimestamp()});transaction.set(auditRef,{id:auditRef.id,action:"CATALOGUE_REQUEST_REJECTED",actorId,targetId:requestId,reason:reason.trim().slice(0,500),createdAt:serverTimestamp()})});
}

export async function mergeFigureRequest(requestId:string,canonicalFigureId:string){
  if(!auth?.currentUser)throw new Error("Sign in again before merging catalogue records.");
  const token=await auth.currentUser.getIdToken();const response=await fetch(`/api/admin/catalogue/requests/${requestId}/merge`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({canonicalFigureId})});
  const result=await response.json() as {error?:string;slug?:string;migrated?:number};if(!response.ok)throw new Error(result.error||"The catalogue records could not be merged.");return result;
}
