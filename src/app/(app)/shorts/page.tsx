"use client";

import Link from "next/link";
import { Film, MessageCircle, Plus } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { CreatePostModal } from "@/components/create-post-modal";
import { ShortVideoPlayer } from "@/components/short-video-player";
import { PostLikeButton } from "@/components/post-like-button";
import { PostOverflowMenu, PostSaveButton, PostShareMenu } from "@/components/post-actions";
import { CommentsModal } from "@/components/comments/comments-modal";
import { DataState } from "@/components/ui";
import { useFirestoreCollection } from "@/lib/firestore-data";
import type { Post } from "@/types";

export default function ShortsPage() {
  const { user } = useAuth();
  const posts = useFirestoreCollection<Post>("posts", { where: [["mediaType", "==", "VIDEO"]], orderBy: ["createdAt", "desc"], limit: 30 });
  const [compose, setCompose] = useState(false);
  const [comments, setComments] = useState<Post | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const visible = posts.data.filter(post => !hidden.includes(post.id));
  return <div className="shorts-page">
    <header className="shorts-heading"><div><span className="eyebrow">TinkerTown Shorts</span><h1>Small moments.<br/>Big collections.</h1><p>Unboxings, shelf tours and your latest finds.</p></div><button className="btn btn-primary" onClick={() => setCompose(true)}><Plus size={18}/>Share a short</button></header>
    <DataState loading={posts.loading} error={posts.error} empty={!visible.length} emptyTitle="Your town, in motion" emptyText="Share the first short: a new find, a shelf tour or the details that make it yours.">
      <div className="shorts-layout"><aside className="shorts-note"><Film/><strong>A closer look at collecting.</strong><p>Swipe or scroll to the next short. Press play when something catches your eye.</p><small>Sound starts off. You control playback.</small><Link href="/home">Back to Town Square</Link></aside>
        <div className="shorts-stream" tabIndex={0} aria-label="Collector shorts; scroll for more videos">{visible.map(post => <article className="short-card" key={post.id}>
          <ShortVideoPlayer src={post.videoUrl || ""} label={post.caption} immersive/>
          <div className="short-info"><div><Link href={`/profile/${post.author}`}>@{post.author}</Link><span>{Math.ceil(post.videoDuration || 0)}s</span><PostOverflowMenu post={post} onVisibilityChange={hide => setHidden(current => hide ? [...current, post.id] : current.filter(id => id !== post.id))}/></div><p>{post.caption}</p></div>
          <footer className="post-actions"><PostLikeButton postId={post.id} likeCount={post.likes || 0}/><button aria-label="Open comments" onClick={() => setComments(post)}><MessageCircle size={20}/><span>{post.comments || 0}</span></button><PostShareMenu post={post}/><PostSaveButton postId={post.id}/></footer>
        </article>)}</div>
      </div>
    </DataState>
    {compose && user && <CreatePostModal open onClose={() => setCompose(false)} user={user} initialMode="video"/>}
    {comments && <CommentsModal postId={comments.id} count={comments.comments || 0} onClose={() => setComments(null)}/>}
  </div>;
}
