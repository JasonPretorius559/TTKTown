"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useState } from "react";
import { Link2, MapPin, Settings, UserPlus } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { DataState, EmptyState, FigureCard, ListingCard } from "@/components/ui";
import { removeRecord, setRecord, useFirestoreCollection } from "@/lib/firestore-data";
import type { CollectionItem, Figure, Listing, Post, UserProfile } from "@/types";

export default function ProfilePage({params}:{params:Promise<{username:string}>}){
  const {username}=use(params);const {user}=useAuth();
  const profileState=useFirestoreCollection<UserProfile>("users",{where:[["username","==",username]],limit:1});const profile=profileState.data[0];const own=user?.uid===profile?.uid;
  const followsState=useFirestoreCollection<{id:string;followerId:string;followingId:string}>("follows",{where:[["followerId","==",user?.uid||"__none__"]]});const following=followsState.data.some(f=>f.followingId===profile?.uid);
  const collectionState=useFirestoreCollection<CollectionItem>(profile?`users/${profile.uid}/collectionItems`:"");const figuresState=useFirestoreCollection<Figure>("figures");
  const listingsState=useFirestoreCollection<Listing>("listings",{where:[["sellerId","==",profile?.uid||"__none__"]]});const postsState=useFirestoreCollection<Post>("posts",{where:[["authorId","==",profile?.uid||"__none__"]],orderBy:["createdAt","desc"],limit:4});
  const [busy,setBusy]=useState(false);const [status,setStatus]=useState("");
  const toggleFollow=async()=>{if(!user||!profile||busy)return;setBusy(true);setStatus("");const id=`${user.uid}_${profile.uid}`;try{if(following)await removeRecord(`follows/${id}`);else await setRecord(`follows/${id}`,{followerId:user.uid,followingId:profile.uid},false);setStatus(following?"No longer following.":"Now following.")}catch(reason){setStatus(reason instanceof Error?reason.message:"Follow update failed. Try again.")}finally{setBusy(false)}};
  const collection=collectionState.data.map(item=>figuresState.data.find(f=>f.id===item.figureId)).filter((f):f is Figure=>Boolean(f));
  return <div className="page"><DataState loading={profileState.loading} error={profileState.error} empty={!profile}>{profile&&<>
    <div className="profile-banner"/><div className="profile-header"><Image className="avatar profile-avatar" src={profile.avatar||"/tinkertown-mark.svg"} alt={profile.displayName||profile.username} width={120} height={120}/><div className="profile-summary"><h1>{profile.displayName||profile.username}</h1><div className="meta">@{profile.username}</div></div><div className="profile-actions">{own?<Link href="/settings/profile" className="btn btn-outline"><Settings size={17}/>Edit Profile</Link>:<button disabled={busy} className={`btn ${following?"btn-soft":"btn-primary"}`} onClick={toggleFollow}><UserPlus size={17}/>{busy?"Updating…":following?"Following":"Follow"}</button>}</div></div>
    {status&&<div className="demo-note" role="status" aria-live="polite">{status}</div>}<div className="profile-bio"><p>{profile.bio}</p><div className="meta"><MapPin size={13}/> {profile.location}{profile.website&&<> · <Link2 size={13}/> <a href={profile.website} target="_blank" rel="noreferrer">{profile.website}</a></>}</div></div>
    <div className="stat-grid section"><div className="stat-card card"><span>Collection</span><strong>{collectionState.data.length}</strong></div><div className="stat-card card"><span>Listings</span><strong>{listingsState.data.length}</strong></div><div className="stat-card card"><span>Posts</span><strong>{postsState.data.length}</strong></div></div>
    <nav className="profile-tabs" aria-label="Profile sections"><a href="#posts">Posts</a><a href="#collection">Collection</a>{own&&<Link href="/wishlist">Wishlist</Link>}{own&&<Link href="/saved">Saved Posts</Link>}<a href="#listings">Listings</a></nav>
    <section className="section" id="posts"><div className="section-head"><h2>Recent posts</h2></div>{postsState.data.length?<div className="profile-posts">{postsState.data.map(post=><Link href={`/posts/${post.id}`} className="card" key={post.id}>{post.image&&<Image src={post.image} alt="" width={220} height={180}/>}<p>{post.caption||"View post"}</p></Link>)}</div>:<EmptyState title="No Posts Yet" description="This collector has not shared a shelf update."/>}</section>
    <section className="section" id="collection"><div className="section-head"><h2>Collection</h2></div>{collection.length?<div className="shelf-grid">{collection.map(f=><FigureCard key={f.id} figure={f}/>)}</div>:<EmptyState title="No Collection Items Yet" description="This collector has not added any figures."/>}</section>
    <section className="section" id="listings"><div className="section-head"><h2>Listings</h2></div>{listingsState.data.length?<div className="shelf-grid">{listingsState.data.map(l=><ListingCard key={l.id} listing={l} figure={figuresState.data.find(x=>x.id===l.figureId)}/>)}</div>:<EmptyState title="No Active Listings" description="This collector is not selling anything right now."/>}</section>
  </>}</DataState></div>;
}
