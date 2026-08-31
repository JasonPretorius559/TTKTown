"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast-provider";
import { setPostLike, useFirestoreDocument } from "@/lib/firestore-data";
import { formatCompactCount } from "@/lib/utils";
import type { PostLike } from "@/types";

type LikeResponse={liked:boolean;likeCount:number};

export function PostLikeButton({postId,likeCount}:{postId:string;likeCount:number}){
  const {user}=useAuth();const router=useRouter();const toast=useToast();
  const likeState=useFirestoreDocument<PostLike>(user?`posts/${postId}/likes/${user.uid}`:null);
  const [optimistic,setOptimistic]=useState<LikeResponse|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  const liked=optimistic?.liked??Boolean(likeState.data);const count=optimistic?.likeCount??Math.max(0,likeCount||0);
  const toggle=async()=>{
    if(!user){router.push("/login");return}
    if(busy)return;
    const nextLiked=!liked;const previous={liked,likeCount:count};setBusy(true);setError("");setOptimistic({liked:nextLiked,likeCount:Math.max(0,count+(nextLiked?1:-1))});
    try{
      const result=await setPostLike(postId,user.uid,nextLiked);setOptimistic(result);toast(nextLiked?"Post liked":"Like removed");
      window.setTimeout(()=>setOptimistic(null),450);
    }catch(reason){setOptimistic(previous);setError(reason instanceof Error?reason.message:"Could not update like");toast("Could not update the like");window.setTimeout(()=>setOptimistic(null),1200)}
    finally{setBusy(false)}
  };
  return <><button className={liked?"liked":""} aria-label={liked?"Unlike post":"Like post"} aria-pressed={liked} disabled={busy} onClick={toggle}><Heart size={19} fill={liked?"currentColor":"none"}/>{count>0&&<span>{formatCompactCount(count)}</span>}</button>{error&&<span className="sr-only" role="alert">{error}</span>}</>;
}
