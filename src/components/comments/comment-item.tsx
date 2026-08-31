"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, ChevronDown, ChevronUp, MoreHorizontal, Pencil, Reply, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { CommentComposer } from "@/components/comments/comment-composer";
import { CommentLikeButton } from "@/components/comments/comment-like-button";
import { createComment, deleteComment, editComment, reportComment } from "@/lib/comments";
import { useFirestoreCollection } from "@/lib/firestore-data";
import type { CommentItem as CommentType } from "@/types";

function millis(value:unknown){if(value&&typeof value==="object"&&"toMillis" in value&&typeof (value as {toMillis:()=>number}).toMillis==="function")return (value as {toMillis:()=>number}).toMillis();if(value instanceof Date)return value.getTime();return 0}
function relative(value:unknown){const time=millis(value);if(!time)return "now";const seconds=Math.max(1,Math.floor((Date.now()-time)/1000));if(seconds<60)return `${seconds}s`;const minutes=Math.floor(seconds/60);if(minutes<60)return `${minutes}m`;const hours=Math.floor(minutes/60);if(hours<24)return `${hours}h`;return `${Math.floor(hours/24)}d`}

export function CommentItem({comment,postId,depth=0}:{comment:CommentType;postId:string;depth?:number}){
  const {user}=useAuth();const [expanded,setExpanded]=useState(false);const [replying,setReplying]=useState(false);const [menu,setMenu]=useState(false);const [editing,setEditing]=useState(false);const [editText,setEditText]=useState(comment.content);const [pending,setPending]=useState<CommentType[]>([]);const [status,setStatus]=useState("");
  const repliesState=useFirestoreCollection<CommentType>(expanded?`posts/${postId}/comments`:"",{where:[["parentId","==",comment.id]],orderBy:["createdAt","asc"],limit:20});
  const replies=useMemo(()=>[...repliesState.data,...pending],[pending,repliesState.data]);const own=user?.uid===comment.authorId;const deleted=Boolean(comment.deletedAt);
  const addReply=async(content:string)=>{if(!user)return;const temp:CommentType={id:`temp-${crypto.randomUUID()}`,postId,authorId:user.uid,authorUsername:user.username,authorName:user.displayName,authorAvatar:user.avatar,parentId:comment.id,depth:comment.depth+1,content,likeCount:0,replyCount:0,createdAt:new Date(),pending:true};setExpanded(true);setPending(current=>[...current,temp]);try{await createComment({postId,content,parent:comment,user});setPending(current=>current.filter(item=>item.id!==temp.id));setReplying(false)}catch(reason){setPending(current=>current.map(item=>item.id===temp.id?{...item,pending:false,failed:true}:item));throw reason}};
  const saveEdit=async()=>{try{await editComment(postId,comment.id,editText);setEditing(false);setStatus("Comment updated.")}catch(reason){setStatus(reason instanceof Error?reason.message:"Edit failed.")}};
  const remove=async()=>{if(!window.confirm("Delete this comment? Replies will remain visible."))return;try{await deleteComment(postId,comment.id);setMenu(false)}catch(reason){setStatus(reason instanceof Error?reason.message:"Delete failed.")}};
  const report=async()=>{if(!user)return;try{await reportComment(postId,comment.id,user.uid,"OTHER");setMenu(false);setStatus("Report submitted for review.")}catch(reason){setStatus(reason instanceof Error?reason.message:"Report failed.")}};
  const visualDepth=Math.min(depth,3);
  return <article className={`comment-node depth-${visualDepth} ${comment.pending?"pending":""} ${comment.failed?"failed":""}`} style={{"--comment-depth":visualDepth} as React.CSSProperties}><div className="comment-branch"/><div className="comment-main">
    <header className="comment-head">{deleted?<div className="deleted-avatar"/>:<Link href={comment.authorUsername?`/profile/${comment.authorUsername}`:"/onboarding"}><Image className="avatar" src={comment.authorAvatar||"/tinkertown-mark.svg"} alt="" width={34} height={34}/></Link>}<div>{deleted?<strong>Deleted comment</strong>:<><Link href={comment.authorUsername?`/profile/${comment.authorUsername}`:"/onboarding"}><strong>{comment.authorName}</strong></Link><small>@{comment.authorUsername||"collector"} · {relative(comment.createdAt)} {millis(comment.updatedAt)>millis(comment.createdAt)+1000&&"· Edited"}</small></>}</div>{!deleted&&!comment.pending&&<button className="comment-more" onClick={()=>setMenu(value=>!value)} aria-label="Comment options"><MoreHorizontal size={17}/></button>}{menu&&<div className="comment-menu">{own?<><button onClick={()=>{setEditing(true);setMenu(false)}}><Pencil/>Edit</button><button onClick={remove}><Trash2/>Delete</button></>:<button onClick={report}>Report</button>}</div>}</header>
    {deleted?<p className="deleted-copy">Comment deleted</p>:editing?<div className="comment-edit"><textarea value={editText} onChange={event=>setEditText(event.target.value)} maxLength={1500}/><div><button onClick={()=>setEditing(false)}><X/>Cancel</button><button onClick={saveEdit}><Check/>Save</button></div></div>:<p className="comment-copy">{comment.content}</p>}
    {!deleted&&!comment.pending&&<div className="comment-actions"><CommentLikeButton postId={postId} commentId={comment.id} likeCount={comment.likeCount||0}/><button onClick={()=>setReplying(value=>!value)}><Reply size={14}/>Reply</button></div>}
    {comment.failed&&<div className="comment-error">Failed to post. Copy your text and try again.</div>}{status&&<div className="comment-status" role="status">{status}</div>}
    {replying&&!deleted&&<CommentComposer autoFocus replyingTo={comment.authorUsername||"collector"} onCancel={()=>setReplying(false)} onSubmit={addReply}/>}
    {comment.replyCount>0&&!expanded&&<button className="view-replies" onClick={()=>setExpanded(true)}><ChevronDown/>View {comment.replyCount} {comment.replyCount===1?"reply":"replies"}</button>}
    {expanded&&<div className="comment-children">{replies.map(reply=><CommentItem key={reply.id} comment={reply} postId={postId} depth={depth+1}/>)}
      {repliesState.loading&&<div className="comment-loading">Loading replies…</div>}{comment.replyCount>0&&<button className="view-replies" onClick={()=>setExpanded(false)}><ChevronUp/>Hide replies</button>}
    </div>}
  </div></article>;
}
