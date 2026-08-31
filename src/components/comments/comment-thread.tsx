"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { CommentComposer } from "@/components/comments/comment-composer";
import { CommentItem } from "@/components/comments/comment-item";
import { createComment } from "@/lib/comments";
import { useFirestoreCollection } from "@/lib/firestore-data";
import type { CommentItem as CommentType } from "@/types";

export function CommentThread({postId}:{postId:string}){
  const {user}=useAuth();const [sort,setSort]=useState<"top"|"newest">("top");const [visible,setVisible]=useState(20);const [pending,setPending]=useState<CommentType[]>([]);
  const commentsState=useFirestoreCollection<CommentType>(`posts/${postId}/comments`,{where:[["parentId","==",null]],orderBy:[sort==="top"?"likeCount":"createdAt","desc"],limit:visible});
  const comments=useMemo(()=>[...pending,...commentsState.data],[commentsState.data,pending]);
  const add=async(content:string)=>{if(!user)return;const temp:CommentType={id:`temp-${crypto.randomUUID()}`,postId,authorId:user.uid,authorUsername:user.username,authorName:user.displayName,authorAvatar:user.avatar,parentId:null,depth:0,content,likeCount:0,replyCount:0,createdAt:new Date(),pending:true};setPending(current=>[temp,...current]);try{await createComment({postId,content,parent:null,user});setPending(current=>current.filter(item=>item.id!==temp.id))}catch(reason){setPending(current=>current.map(item=>item.id===temp.id?{...item,pending:false,failed:true}:item));throw reason}};
  return <div className="comment-thread"><div className="comment-toolbar"><label>Sort <select value={sort} onChange={event=>{setSort(event.target.value as "top"|"newest");setVisible(20)}}><option value="top">Top</option><option value="newest">Newest</option></select></label></div><div className="comment-scroll">{commentsState.loading&&<div className="comment-skeleton" role="status">Loading the conversation…</div>}{commentsState.error&&<div className="comments-empty" role="alert"><h3>Couldn’t load comments.</h3><p>{commentsState.error}</p></div>}{!commentsState.loading&&!commentsState.error&&!comments.length&&<div className="comments-empty"><h3>No comments yet.</h3><p>Start the conversation.</p></div>}{comments.map(comment=><CommentItem key={comment.id} comment={comment} postId={postId}/>) }{commentsState.data.length===visible&&<button className="load-comments" onClick={()=>setVisible(value=>value+20)}>Load more comments</button>}</div><div className="comment-composer-pin"><CommentComposer onSubmit={add}/></div></div>;
}
