"use client";

import { doc, runTransaction, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { assertAppropriateContent } from "@/lib/content-filter";

export const reportReasons=["SPAM","SCAM","HARASSMENT","HATE_ABUSIVE","INAPPROPRIATE","COUNTERFEIT","MISLEADING","OTHER"] as const;
export type ReportReason=typeof reportReasons[number];
export type ReportTarget="POST"|"COMMENT"|"USER"|"LISTING";

export async function submitReport({reporterId,targetType,targetId,reason,details=""}:{reporterId:string;targetType:ReportTarget;targetId:string;reason:ReportReason;details?:string}){
  if(!db)throw new Error("Firebase is not configured");assertAppropriateContent([details]);const reportId=`${reporterId}_${targetType}_${targetId}`;const reportRef=doc(db,"reports",reportId);
  return runTransaction(db,async transaction=>{const snapshot=await transaction.get(reportRef);if(snapshot.exists()&&["OPEN","UNDER_REVIEW"].includes(snapshot.data().status))throw new Error("You’ve already reported this item.");transaction.set(reportRef,{id:reportId,reporterId,targetType,targetId,reason,details:details.trim().slice(0,500),status:"OPEN",createdAt:snapshot.exists()?snapshot.data().createdAt:serverTimestamp(),updatedAt:serverTimestamp(),reviewedAt:null,reviewedBy:null});return reportId});
}

export async function savePost(userId:string,postId:string){
  if(!db)throw new Error("Firebase is not configured");await setDoc(doc(db,`users/${userId}/savedPosts/${postId}`),{id:postId,userId,postId,createdAt:serverTimestamp()});
}
