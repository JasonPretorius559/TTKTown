"use client";

import Image from "next/image";
import Link from "next/link";
import {use,useEffect,useMemo,useRef,useState} from "react";
import {ArrowLeft,ArrowUpRight,Check,Send} from "lucide-react";
import {useAuth} from "@/components/auth-provider";
import {markConversationRead,sendConversationMessage,useFirestoreCollection,useFirestoreDocument} from "@/lib/firestore-data";
import {formatMessageTime} from "@/lib/messaging";
import type {Conversation,Message,UserProfile} from "@/types";

type PendingMessage={id:string;content:string;createdAt:Date};

function MessageContent({content}:{content:string}){
  const match=content.match(/^(?:https?:\/\/[^/\s]+)?(\/posts\/[^\s]+)$/);
  if(match)return <Link className="shared-post-link" href={match[1]}><span>Shared TinkerTown post</span><strong>Open post <ArrowUpRight size={14}/></strong></Link>;
  return <>{content}</>;
}

export default function ConversationPage({params,searchParams}:{params:Promise<{conversationId:string}>;searchParams:Promise<{share?:string}>}){
  const {conversationId}=use(params);const {share=""}=use(searchParams);const {user}=useAuth();
  const conversation=useFirestoreDocument<Conversation>(`conversations/${conversationId}`);
  const otherId=conversation.data?.memberIds.find(id=>id!==user?.uid)||"";
  const otherProfile=useFirestoreDocument<UserProfile>(otherId?`users/${otherId}`:null);
  const messages=useFirestoreCollection<Message>(`conversations/${conversationId}/messages`,{orderBy:["createdAt","asc"],limit:200});
  const [text,setText]=useState(share);const [pending,setPending]=useState<PendingMessage[]>([]);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  const scrollRef=useRef<HTMLDivElement>(null);const markedRef=useRef("");
  const other=useMemo(()=>({
    name:otherProfile.data?.displayName||conversation.data?.memberNames?.[otherId]||otherProfile.data?.username||"Collector",
    username:otherProfile.data?.username||conversation.data?.memberUsernames?.[otherId]||"collector",
    avatar:otherProfile.data?.avatar||conversation.data?.memberAvatars?.[otherId]||"/tinkertown-mark.svg"
  }),[conversation.data,otherId,otherProfile.data]);

  useEffect(()=>{scrollRef.current?.scrollTo({top:scrollRef.current.scrollHeight,behavior:messages.data.length>1?"smooth":"auto"})},[messages.data.length,pending.length]);
  useEffect(()=>{
    const latest=conversation.data?.lastMessageId;
    if(!user||!latest||conversation.data?.lastSenderId===user.uid||markedRef.current===latest)return;
    markedRef.current=latest;markConversationRead(conversationId,user.uid).catch(()=>{markedRef.current=""});
  },[conversation.data?.lastMessageId,conversation.data?.lastSenderId,conversationId,user]);

  const send=async()=>{
    const content=text.trim();if(!user||!content||busy)return;
    const optimistic={id:`pending-${crypto.randomUUID()}`,content,createdAt:new Date()};
    setPending(current=>[...current,optimistic]);setText("");setBusy(true);setError("");
    try{await sendConversationMessage(conversationId,user.uid,content);setPending(current=>current.filter(item=>item.id!==optimistic.id))}
    catch(reason){setPending(current=>current.filter(item=>item.id!==optimistic.id));setText(current=>current||content);setError(reason instanceof Error?reason.message:"Message failed. Try again.")}
    finally{setBusy(false)}
  };
  const submit=(event:React.FormEvent)=>{event.preventDefault();void send()};

  if(conversation.loading)return <div className="page conversation-page"><div className="message-state" role="status">Opening this conversation…</div></div>;
  if(conversation.error||!conversation.data||!user||!conversation.data.memberIds.includes(user.uid))return <div className="page conversation-page"><Link href="/messages" className="conversation-back"><ArrowLeft/>Back to messages</Link><div className="message-state" role="alert"><strong>Conversation unavailable.</strong><span>{conversation.error||"This conversation does not exist or is not available to your account."}</span></div></div>;

  return <div className="page conversation-page">
    <header className="conversation-header">
      <Link href="/messages" className="conversation-back" aria-label="Back to messages"><ArrowLeft/></Link>
      <Image className="avatar" src={other.avatar} alt="" width={48} height={48}/>
      <div><span>Direct message</span><h1>{other.name}</h1><Link href={`/profile/${other.username}`}>@{other.username}</Link></div>
      <div className="conversation-trust"><Check size={15}/><span>Collector-to-collector</span></div>
    </header>

    <div className="message-thread" ref={scrollRef} aria-live="polite" aria-label={`Conversation with ${other.name}`}>
      {messages.loading&&<div className="message-state" role="status">Loading messages…</div>}
      {messages.error&&<div className="message-state" role="alert">{messages.error}</div>}
      {!messages.loading&&!messages.error&&!messages.data.length&&!pending.length&&<div className="thread-empty"><span>BEGIN THE STORY</span><h2>Say hello to {other.name}.</h2><p>Ask about a collection, share a post, or start talking through a trade.</p></div>}
      {messages.data.map(message=>{const mine=message.senderId===user.uid;return <article className={`message-bubble ${mine?"is-mine":"is-theirs"}`} key={message.id}><div><MessageContent content={message.content}/></div><footer><time>{formatMessageTime(message.createdAt)}</time>{mine&&<Check size={13} aria-label="Sent"/>}</footer></article>})}
      {pending.map(message=><article className="message-bubble is-mine is-pending" key={message.id}><div><MessageContent content={message.content}/></div><footer><time>{formatMessageTime(message.createdAt)}</time><span>Sending…</span></footer></article>)}
    </div>

    <form className="message-composer" onSubmit={submit} aria-busy={busy}>
      {error&&<div className="message-alert" role="alert">{error}</div>}
      <label><span className="sr-only">Message {other.name}</span><textarea name="message" autoComplete="off" maxLength={2000} rows={1} value={text} onChange={event=>setText(event.target.value)} placeholder={`Message ${other.name}…`} onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();event.currentTarget.form?.requestSubmit()}}}/></label>
      <div className="composer-meta"><span>{text.length?`${text.length}/2000`:"Enter to send · Shift + Enter for a new line"}</span><button disabled={busy||!text.trim()} aria-label="Send message" className="btn btn-primary" type="submit"><Send size={18}/><span>{busy?"Sending":"Send"}</span></button></div>
    </form>
  </div>;
}
