"use client";

import Image from "next/image";
import Link from "next/link";
import { Film, Grid2X2, ImagePlus, MessageCircle, Store, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { ShortVideoPlayer } from "@/components/short-video-player";
import { CreatePostModal } from "@/components/create-post-modal";
import { CommentsModal } from "@/components/comments/comments-modal";
import { PostLikeButton } from "@/components/post-like-button";
import { PostOverflowMenu, PostSaveButton, PostShareMenu } from "@/components/post-actions";
import { DataState, ListingCard } from "@/components/ui";
import { setRecord, useFirestoreCollection } from "@/lib/firestore-data";
import { formatCompactCount } from "@/lib/utils";
import type { Figure, Listing, Post, UserProfile } from "@/types";

type ComposerMode="video"|"photo"|"figure"|"listing"|null;

function PostMedia({images,caption,eager=false}:{images:string[];caption:string;eager?:boolean}){
  const visible=images.filter(Boolean).slice(0,4);if(!visible.length)return null;
  return <div className={`post-media-grid media-${visible.length}`}>{visible.map((src,index)=><div key={src} className="post-media-cell"><Image src={src} alt={caption?`${caption} — image ${index+1}`:`Post image ${index+1}`} fill loading={eager&&index===0?"eager":"lazy"} sizes="(max-width: 800px) 100vw, 680px"/></div>)}</div>;
}

function AttachmentPreview({post,figures,listings}:{post:Post;figures:Figure[];listings:Listing[]}){
  const figure=figures.find(f=>f.id===post.figureId);const listing=listings.find(l=>l.id===post.listingId);
  if(figure)return <Link className="post-attachment" href={`/figures/${figure.slug}`}><Image src={figure.image} alt="" width={76} height={76}/><span><small>Attached figure</small><strong>{figure.name}</strong><em>{figure.franchise} · {figure.manufacturer}</em></span><Grid2X2 size={19}/></Link>;
  if(listing)return <Link className="post-attachment" href={`/marketplace/listings/${listing.id}`}><Image src={listing.image} alt="" width={76} height={76}/><span><small>Marketplace listing</small><strong>{listing.title}</strong><em>View this collector listing</em></span><Store size={19}/></Link>;
  return null;
}

export default function HomePage(){
  const {user}=useAuth();
  const postsState=useFirestoreCollection<Post>("posts",{orderBy:["createdAt","desc"],limit:30});
  const figuresState=useFirestoreCollection<Figure>("figures",{limit:100});
  const listingsState=useFirestoreCollection<Listing>("listings",{where:[["status","==","ACTIVE"]],orderBy:["createdAt","desc"],limit:30});
  const usersState=useFirestoreCollection<UserProfile>("users",{limit:20});
  const [modalOpen,setModalOpen]=useState(false);const [initialMode,setInitialMode]=useState<ComposerMode>(null);const [followed,setFollowed]=useState<string[]>([]);const [commentPost,setCommentPost]=useState<Post|null>(null);const [hiddenPosts,setHiddenPosts]=useState<string[]>([]);
  const greeting=(()=>{const hour=new Date().getHours();return hour<12?"Good morning":hour<18?"Good afternoon":"Good evening"})();
  const trending=useMemo(()=>[...figuresState.data].sort((a,b)=>((b.owned||0)+(b.wanted||0))-((a.owned||0)+(a.wanted||0))).slice(0,3),[figuresState.data]);
  const suggested=usersState.data.filter(profile=>profile.uid!==user?.uid).slice(0,3);
  const open=(mode:ComposerMode=null)=>{setInitialMode(mode);setModalOpen(true)};
  const follow=async(profile:UserProfile)=>{if(!user)return;await setRecord(`follows/${user.uid}_${profile.uid}`,{followerId:user.uid,followingId:profile.uid},false);setFollowed(current=>[...current,profile.uid])};
  const setPostHidden=(postId:string,hidden:boolean)=>setHiddenPosts(current=>hidden?[...new Set([...current,postId])]:current.filter(id=>id!==postId));

  return <div className="town-page">
    <header className="town-heading"><div className="eyebrow">Town Square</div><h1>{greeting}, {user?.displayName?.split(" ")[0]||"Collector"}.</h1><p>See what collectors are sharing, finding, and putting up for sale.</p></header>
    <div className="town-layout"><main className="town-feed">
      <section className="quick-composer card"><Image className="avatar" src={user?.avatar||"/tinkertown-mark.svg"} alt="" width={44} height={44}/><button className="composer-prompt" onClick={()=>open()}>What’s new on your shelf?</button><div className="quick-actions"><button onClick={()=>open("video")}><Film size={18}/><span>Short</span></button><button onClick={()=>open("photo")}><ImagePlus size={18}/><span>Photo</span></button><button onClick={()=>open("figure")}><Grid2X2 size={18}/><span>Figure</span></button><button onClick={()=>open("listing")}><Store size={18}/><span>Listing</span></button></div></section>
      <DataState loading={postsState.loading} error={postsState.error} empty={!postsState.data.length}><div className="post-stream">{postsState.data.filter(post=>!hiddenPosts.includes(post.id)).map((post,index)=><div key={post.id}>
        {index===2&&listingsState.data.length>0&&<section className="feed-market"><div className="section-head"><div><small>Fresh from Marketplace</small><h2>New shelf finds</h2></div><Link href="/marketplace">View all</Link></div><div className="feed-market-row">{listingsState.data.slice(0,3).map(listing=><ListingCard key={listing.id} listing={listing} figure={figuresState.data.find(f=>f.id===listing.figureId)}/>)}</div></section>}
        <article className="post-card card"><header className="post-head"><Link href={`/profile/${post.author}`}><Image className="avatar" src={post.avatar||"/tinkertown-mark.svg"} alt="" width={44} height={44}/></Link><div><Link href={`/profile/${post.author}`}><strong>{post.displayName}</strong></Link><div className="meta">@{post.author} · {post.time||"Recently"}</div></div><PostOverflowMenu post={post} onVisibilityChange={hidden=>setPostHidden(post.id,hidden)}/></header>
          {post.caption&&<p className="post-caption">{post.caption}</p>}<AttachmentPreview post={post} figures={figuresState.data} listings={listingsState.data}/>{post.mediaType==="VIDEO"&&post.videoUrl?<ShortVideoPlayer src={post.videoUrl} label={post.caption}/>:(<PostMedia images={post.images?.length?post.images:[post.image]} caption={post.caption} eager={index===0}/>)}
          <footer className="post-actions"><PostLikeButton postId={post.id} likeCount={post.likes||0}/><button aria-label="View comments" onClick={()=>setCommentPost(post)}><MessageCircle size={19}/>{post.comments>0&&<span>{formatCompactCount(post.comments)}</span>}</button><PostShareMenu post={post}/><PostSaveButton postId={post.id}/></footer>
        </article>
      </div>)}</div></DataState>
    </main>
    <aside className="town-rail" aria-label="Town Square recommendations"><Link className="shorts-promo" href="/shorts"><Film/><span><small>COLLECTORS IN MOTION</small><strong>Watch Shorts</strong><em>Shelf tours. Fresh finds. Little details.</em></span></Link>
      <section className="rail-card card"><div className="rail-head"><h2>Trending Figures</h2><Link href="/discover">See all</Link></div>{trending.map((figure,index)=><Link href={`/figures/${figure.slug}`} className="trend-row" key={figure.id}><span>{String(index+1).padStart(2,"0")}</span><Image src={figure.image} alt="" width={48} height={48}/><div><strong>{figure.name}</strong><small>{figure.franchise} · {figure.wanted||0} wanted</small></div></Link>)}</section>
      <section className="rail-card card"><div className="rail-head"><h2>Suggested Collectors</h2><Link href="/discover">Find more</Link></div>{suggested.map(profile=><div className="collector-row" key={profile.uid}><Link href={`/profile/${profile.username}`}><Image className="avatar" src={profile.avatar||"/tinkertown-mark.svg"} alt="" width={40} height={40}/></Link><div><strong>{profile.displayName}</strong><small>@{profile.username}</small></div><button disabled={followed.includes(profile.uid)} onClick={()=>follow(profile)} aria-label={`Follow ${profile.displayName}`}><UserPlus size={15}/>{followed.includes(profile.uid)?"Following":"Follow"}</button></div>)}</section>
      <section className="rail-card rail-market card"><div><small>COLLECTOR MARKET</small><h2>Ready to make shelf space?</h2><p>List a figure in a few guided steps.</p></div><Link className="btn btn-primary" href="/marketplace/sell">Sell a Figure</Link></section>
    </aside></div>
    {user&&<CreatePostModal key={`${modalOpen}-${initialMode}`} open={modalOpen} onClose={()=>setModalOpen(false)} user={user} initialMode={initialMode}/>}
    {commentPost&&<CommentsModal postId={commentPost.id} count={commentPost.comments||0} onClose={()=>setCommentPost(null)}/>}
  </div>;
}
