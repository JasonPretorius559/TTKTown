"use client";

import Image from "next/image";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { DataState } from "@/components/ui";
import { PostOverflowMenu, PostSaveButton, PostShareMenu } from "@/components/post-actions";
import { PostLikeButton } from "@/components/post-like-button";
import { useFirestoreCollection } from "@/lib/firestore-data";
import type { Post, SavedPost } from "@/types";

export default function SavedPostsPage(){
  const {user}=useAuth();const saved=useFirestoreCollection<SavedPost>(user?`users/${user.uid}/savedPosts`:"",{orderBy:["createdAt","desc"],limit:100});const posts=useFirestoreCollection<Post>("posts",{orderBy:["createdAt","desc"],limit:100});const savedIds=new Set(saved.data.map(item=>item.postId));const results=posts.data.filter(post=>savedIds.has(post.id));
  return <div className="page saved-posts-page"><header className="page-title"><div><div className="eyebrow">Your account</div><h1>Saved Posts</h1><p>Posts you set aside for later. These are separate from your figure Wishlist.</p></div></header><DataState loading={saved.loading||posts.loading} error={saved.error||posts.error} empty={!results.length} emptyTitle="No saved posts yet" emptyText="Use the bookmark on any Town Square post to keep it here."><div className="saved-post-grid">{results.map(post=><article className="saved-post-card card" key={post.id}><header className="post-head"><Link href={`/profile/${post.author}`}><Image className="avatar" src={post.avatar||"/tinkertown-mark.svg"} alt="" width={42} height={42}/></Link><div><Link href={`/profile/${post.author}`}><strong>{post.displayName}</strong></Link><span className="meta">@{post.author}</span></div><PostOverflowMenu post={post}/></header>{(post.images?.[0]||post.image)&&<Link className="saved-post-media" href={`/posts/${post.id}`}><Image src={post.images?.[0]||post.image} alt={post.caption||"Saved post"} fill sizes="(max-width: 700px) 100vw, 420px"/></Link>}<div className="saved-post-copy"><p>{post.caption||"View this post on TinkerTown."}</p><Link href={`/posts/${post.id}`}>Open post</Link></div><footer className="post-actions"><PostLikeButton postId={post.id} likeCount={post.likes||0}/><PostShareMenu post={post}/><PostSaveButton postId={post.id}/></footer></article>)}</div></DataState>{!results.length&&!saved.loading&&!posts.loading&&<div className="saved-empty-mark" aria-hidden="true"><Bookmark/></div>}</div>;
}
