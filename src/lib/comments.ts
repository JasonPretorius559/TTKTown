"use client";

import { collection, doc, runTransaction, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { assertAppropriateContent } from "@/lib/content-filter";
import type { CommentItem, UserProfile } from "@/types";

type CreateInput={postId:string;content:string;parent?:CommentItem|null;user:UserProfile};

export async function createComment({postId,content,parent,user}:CreateInput){
  if(!db)throw new Error("Firebase is not configured");
  const trimmed=content.trim();if(!trimmed||trimmed.length>1500)throw new Error("Comments must be between 1 and 1,500 characters.");
  assertAppropriateContent([trimmed]);
  const commentRef=doc(collection(db,`posts/${postId}/comments`));const postRef=doc(db,"posts",postId);const parentRef=parent?doc(db,`posts/${postId}/comments/${parent.id}`):null;
  const result=await runTransaction(db,async transaction=>{
    const postSnapshot=await transaction.get(postRef);if(!postSnapshot.exists())throw new Error("Post not found");
    const parentSnapshot=parentRef?await transaction.get(parentRef):null;const parentData=parentSnapshot?.exists()?parentSnapshot.data():null;
    if(parentRef&&(!parentData||parentData.postId!==postId||parentData.deletedAt))throw new Error("This comment can no longer receive replies.");
    const depth=parentData?Number(parentData.depth||0)+1:0;
    const value={id:commentRef.id,postId,authorId:user.uid,authorUsername:user.username||"",authorName:user.displayName||user.username||"Collector",authorAvatar:user.avatar||"/tinkertown-mark.svg",parentId:parent?.id||null,depth,content:trimmed,likeCount:0,replyCount:0,deletedAt:null,createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
    transaction.set(commentRef,value);
    transaction.update(postRef,{comments:Number(postSnapshot.data().comments||0)+1,commentMutationId:commentRef.id,updatedAt:serverTimestamp()});
    if(parentRef&&parentData)transaction.update(parentRef,{replyCount:Number(parentData.replyCount||0)+1,replyMutationId:commentRef.id,updatedAt:serverTimestamp()});
    return {comment:{...value,createdAt:new Date(),updatedAt:new Date()} as CommentItem,targetUserId:parentData?.authorId||postSnapshot.data().authorId,targetType:parent?"REPLY":"COMMENT"};
  });
  if(result.targetUserId&&result.targetUserId!==user.uid){
    await setDoc(doc(db,`users/${result.targetUserId}/notifications/${commentRef.id}`),{type:result.targetType,title:parent?`${user.displayName} replied to your comment`:`${user.displayName} commented on your post`,body:trimmed.slice(0,140),actorId:user.uid,targetUserId:result.targetUserId,postId,commentId:commentRef.id,read:false,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
  }
  return result.comment;
}

export async function editComment(postId:string,commentId:string,content:string){
  if(!db)throw new Error("Firebase is not configured");const trimmed=content.trim();if(!trimmed||trimmed.length>1500)throw new Error("Comments must be between 1 and 1,500 characters.");
  assertAppropriateContent([trimmed]);
  await updateDoc(doc(db,`posts/${postId}/comments/${commentId}`),{content:trimmed,updatedAt:serverTimestamp()});
}

export async function deleteComment(postId:string,commentId:string){
  if(!db)throw new Error("Firebase is not configured");
  await updateDoc(doc(db,`posts/${postId}/comments/${commentId}`),{deletedAt:serverTimestamp(),updatedAt:serverTimestamp()});
}

export async function setCommentLike(postId:string,commentId:string,userId:string,shouldLike:boolean){
  if(!db)throw new Error("Firebase is not configured");
  const commentRef=doc(db,`posts/${postId}/comments/${commentId}`);const likeRef=doc(db,`posts/${postId}/comments/${commentId}/likes/${userId}`);
  return runTransaction(db,async transaction=>{
    const [commentSnapshot,likeSnapshot]=await Promise.all([transaction.get(commentRef),transaction.get(likeRef)]);
    if(!commentSnapshot.exists()||commentSnapshot.data().deletedAt)throw new Error("Comment unavailable");
    const count=Math.max(0,Number(commentSnapshot.data().likeCount||0));
    if(shouldLike){if(likeSnapshot.exists())return {liked:true,likeCount:count};transaction.set(likeRef,{id:`${commentId}_${userId}`,postId,commentId,userId,createdAt:serverTimestamp()});transaction.update(commentRef,{likeCount:count+1,updatedAt:serverTimestamp()});return {liked:true,likeCount:count+1}}
    if(!likeSnapshot.exists())return {liked:false,likeCount:count};transaction.delete(likeRef);transaction.update(commentRef,{likeCount:Math.max(0,count-1),updatedAt:serverTimestamp()});return {liked:false,likeCount:Math.max(0,count-1)};
  });
}

export async function reportComment(postId:string,commentId:string,userId:string,reason:string){
  if(!db)throw new Error("Firebase is not configured");
  await setDoc(doc(collection(db,"reports")),{reporterId:userId,targetType:"COMMENT",targetId:commentId,postId,reason,details:"",status:"OPEN",createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
}
