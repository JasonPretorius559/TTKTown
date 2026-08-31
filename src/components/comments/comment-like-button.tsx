"use client";

import { Heart } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { setCommentLike } from "@/lib/comments";
import { useFirestoreDocument } from "@/lib/firestore-data";
import type { CommentLike } from "@/types";

type State={liked:boolean;likeCount:number};
export function CommentLikeButton({postId,commentId,likeCount}:{postId:string;commentId:string;likeCount:number}){
  const {user}=useAuth();const likeState=useFirestoreDocument<CommentLike>(user?`posts/${postId}/comments/${commentId}/likes/${user.uid}`:null);const [optimistic,setOptimistic]=useState<State|null>(null);const [busy,setBusy]=useState(false);
  const liked=optimistic?.liked??Boolean(likeState.data);const count=optimistic?.likeCount??likeCount;
  const toggle=async()=>{if(!user||busy)return;const next=!liked;const previous={liked,likeCount:count};setBusy(true);setOptimistic({liked:next,likeCount:Math.max(0,count+(next?1:-1))});try{const result=await setCommentLike(postId,commentId,user.uid,next);setOptimistic(result);window.setTimeout(()=>setOptimistic(null),400)}catch{setOptimistic(previous);window.setTimeout(()=>setOptimistic(null),1000)}finally{setBusy(false)}};
  return <button className={liked?"liked":""} disabled={busy} onClick={toggle} aria-pressed={liked} aria-label={liked?"Unlike comment":"Like comment"}><Heart size={14} fill={liked?"currentColor":"none"}/>{count>0&&<span>{count}</span>}</button>;
}
