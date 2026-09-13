"use client";

import Image from "next/image";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { use } from "react";
import { CommentThread } from "@/components/comments/comment-thread";
import { DataState } from "@/components/ui";
import { ShortVideoPlayer } from "@/components/short-video-player";
import { ImageGallery } from "@/components/image-gallery";
import { PostLikeButton } from "@/components/post-like-button";
import { PostOverflowMenu, PostSaveButton, PostShareMenu } from "@/components/post-actions";
import { useFirestoreDocument } from "@/lib/firestore-data";
import { formatCompactCount } from "@/lib/utils";
import type { Post } from "@/types";

export default function PostPage({params}:{params:Promise<{id:string}>}){
  const {id}=use(params);const postState=useFirestoreDocument<Post>(`posts/${id}`);
  return <div className="page post-detail-page"><DataState loading={postState.loading} error={postState.error} empty={!postState.data}>{postState.data&&<div className="post-detail-grid"><article className="post-card card"><header className="post-head"><Link href={`/profile/${postState.data.author}`}><Image className="avatar" src={postState.data.avatar||"/tinkertown-mark.svg"} alt="" width={44} height={44}/></Link><div><Link href={`/profile/${postState.data.author}`}><strong>{postState.data.displayName}</strong></Link><div className="meta">@{postState.data.author} · {postState.data.time||"Recently"}</div></div><PostOverflowMenu post={postState.data}/></header>{postState.data.caption&&<p className="post-caption">{postState.data.caption}</p>}{postState.data.mediaType==="VIDEO"&&postState.data.videoUrl?<ShortVideoPlayer src={postState.data.videoUrl} label={postState.data.caption}/>:(<ImageGallery images={postState.data.images?.length?postState.data.images:[postState.data.image]} alt={postState.data.caption}/>)}<footer className="post-actions"><PostLikeButton postId={id} likeCount={postState.data.likes||0}/><a href="#comments"><MessageCircle size={19}/>{postState.data.comments>0&&<span>{formatCompactCount(postState.data.comments)}</span>}</a><PostShareMenu post={postState.data}/><PostSaveButton postId={id}/></footer></article><section className="inline-comments card" id="comments"><header><div><h1>Comments</h1><span>{postState.data.comments||0} in this conversation</span></div></header><CommentThread postId={id}/></section></div>}</DataState></div>;
}
