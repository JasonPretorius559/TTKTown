"use client";

import Image from "next/image";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {use,useMemo,useState} from "react";
import {ArrowRight,MessageCircle,PenLine,Search,Users,X} from "lucide-react";
import {useAuth} from "@/components/auth-provider";
import {startDirectConversation,useFirestoreCollection} from "@/lib/firestore-data";
import {conversationUnread,formatMessageTime} from "@/lib/messaging";
import type {Conversation,UserProfile} from "@/types";

function otherMember(conversation:Conversation,currentUserId:string,profiles:UserProfile[]){
  const id=conversation.memberIds.find(memberId=>memberId!==currentUserId)||"";
  const profile=profiles.find(item=>item.uid===id);
  return {
    id,
    name:profile?.displayName||conversation.memberNames?.[id]||profile?.username||"Collector",
    username:profile?.username||conversation.memberUsernames?.[id]||"collector",
    avatar:profile?.avatar||conversation.memberAvatars?.[id]||"/tinkertown-mark.svg"
  };
}

export default function MessagesPage({searchParams}:{searchParams:Promise<{share?:string;to?:string}>}){
  const {share="",to=""}=use(searchParams);const {user}=useAuth();const router=useRouter();
  const conversations=useFirestoreCollection<Conversation>("conversations",{where:[["memberIds","array-contains",user?.uid||"__none__"]],orderBy:["updatedAt","desc"],limit:50});
  const profiles=useFirestoreCollection<UserProfile>("users",{limit:100});
  const [query,setQuery]=useState("");const [newMessage,setNewMessage]=useState(Boolean(to));const [busyId,setBusyId]=useState("");const [error,setError]=useState("");
  const visibleConversations=useMemo(()=>{
    const needle=query.trim().toLowerCase();
    if(!needle||!user)return conversations.data;
    return conversations.data.filter(conversation=>{const other=otherMember(conversation,user.uid,profiles.data);return `${other.name} ${other.username} ${conversation.lastMessage||""}`.toLowerCase().includes(needle)});
  },[conversations.data,profiles.data,query,user]);
  const visibleProfiles=useMemo(()=>{
    const needle=query.trim().toLowerCase();
    return profiles.data.filter(profile=>profile.uid!==user?.uid&&(!to||profile.uid===to)&&(!needle||`${profile.displayName} ${profile.username}`.toLowerCase().includes(needle))).slice(0,20);
  },[profiles.data,query,to,user?.uid]);
  const start=async(profile:UserProfile)=>{
    if(!user||busyId)return;setBusyId(profile.uid);setError("");
    try{const id=await startDirectConversation(user,profile);router.push(`/messages/${id}${share?`?share=${encodeURIComponent(share)}`:""}`)}
    catch(reason){setError(reason instanceof Error?reason.message:"Could not start this conversation.");setBusyId("")}
  };

  return <div className="page messages-page">
    <header className="messages-hero">
      <div><div className="eyebrow">Collector post office</div><h1>{share?"Send to a collector":"Messages"}</h1><p>{share?"Choose a conversation or start a new one. Your post link is ready to share.":"Private, direct conversations for trades, finds, and the stories behind the shelf."}</p></div>
      <button className="btn btn-primary" onClick={()=>{setNewMessage(value=>!value);setQuery("");setError("")}} aria-expanded={newMessage}><PenLine size={18}/>{newMessage?"Close":"New message"}</button>
    </header>

    <div className="message-search"><Search size={18}/><label><span className="sr-only">{newMessage?"Find a collector":"Search messages"}</span><input className="field" value={query} onChange={event=>setQuery(event.target.value)} autoComplete="off" placeholder={newMessage?"Find a collector by name or username…":"Search conversations…"}/></label>{query&&<button onClick={()=>setQuery("")} aria-label="Clear search"><X size={16}/></button>}</div>
    {error&&<div className="message-alert" role="alert">{error}</div>}

    {newMessage?<section className="new-message-panel" aria-labelledby="new-message-title">
      <div className="message-section-heading"><div><span>Town directory</span><h2 id="new-message-title">Who would you like to message?</h2></div><Users size={24}/></div>
      {profiles.loading?<div className="message-state" role="status">Opening the collector directory…</div>:profiles.error?<div className="message-state" role="alert">{profiles.error}</div>:visibleProfiles.length?<div className="collector-picker">{visibleProfiles.map(profile=><button key={profile.uid} onClick={()=>start(profile)} disabled={Boolean(busyId)}>
        <Image className="avatar" src={profile.avatar||"/tinkertown-mark.svg"} alt="" width={52} height={52}/><span><strong>{profile.displayName||profile.username}</strong><small>@{profile.username}</small></span><em>{busyId===profile.uid?"Opening…":"Message"}<ArrowRight size={15}/></em>
      </button>)}</div>:<div className="message-state"><strong>No collectors found.</strong><span>Try another name or username.</span></div>}
    </section>:<section className="inbox-panel" aria-label="Conversation inbox">
      <div className="message-section-heading"><div><span>Inbox</span><h2>{visibleConversations.length} {visibleConversations.length===1?"conversation":"conversations"}</h2></div><MessageCircle size={24}/></div>
      {conversations.loading?<div className="message-state" role="status">Collecting your conversations…</div>:conversations.error?<div className="message-state" role="alert">{conversations.error}</div>:visibleConversations.length?<div className="conversation-list">{visibleConversations.map(conversation=>{const other=otherMember(conversation,user?.uid||"",profiles.data);const unread=Boolean(user&&conversationUnread(conversation,user.uid));return <Link className={`conversation-row${unread?" is-unread":""}`} href={`/messages/${conversation.id}${share?`?share=${encodeURIComponent(share)}`:""}`} key={conversation.id}>
        <div className="conversation-avatar"><Image className="avatar" src={other.avatar} alt="" width={56} height={56}/>{unread&&<span aria-label="Unread conversation"/>}</div>
        <div className="conversation-copy"><div><strong>{other.name}</strong><time>{formatMessageTime(conversation.lastMessageAt||conversation.updatedAt)}</time></div><small>@{other.username}</small><p>{conversation.lastMessage||"Start the conversation"}</p></div><ArrowRight className="conversation-arrow" size={18}/>
      </Link>})}</div>:<div className="message-empty"><div aria-hidden="true"><MessageCircle size={38}/></div><span>YOUR FIRST HELLO</span><h2>{query?"No matching conversations.":"The post office is quiet."}</h2><p>{query?"Try a different name or message.":"Start a conversation with another collector about a figure, listing, or shelf story."}</p>{!query&&<button className="btn btn-primary" onClick={()=>setNewMessage(true)}><PenLine size={17}/>Start a conversation</button>}</div>}
    </section>}
  </div>;
}
