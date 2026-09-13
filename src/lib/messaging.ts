import type { Conversation } from "@/types";

type TimestampLike={toDate?:()=>Date;seconds?:number};

export function directConversationId(firstUserId:string,secondUserId:string){
  return `direct_${[firstUserId,secondUserId].sort().join("_")}`;
}

export function messageDate(value:unknown){
  if(!value)return null;
  if(value instanceof Date)return value;
  const stamp=value as TimestampLike;
  if(typeof stamp.toDate==="function")return stamp.toDate();
  if(typeof stamp.seconds==="number")return new Date(stamp.seconds*1000);
  return null;
}

export function conversationUnread(conversation:Conversation,userId:string){
  if(!conversation.lastMessageId||conversation.lastSenderId===userId)return false;
  const sent=messageDate(conversation.lastMessageAt)?.getTime()||0;
  const read=messageDate(conversation.lastReadAt?.[userId])?.getTime()||0;
  return sent>read;
}

export function formatMessageTime(value:unknown,now=new Date()){
  const date=messageDate(value);
  if(!date)return "";
  const sameDay=date.toDateString()===now.toDateString();
  if(sameDay)return new Intl.DateTimeFormat("en-ZA",{hour:"2-digit",minute:"2-digit"}).format(date);
  const sameYear=date.getFullYear()===now.getFullYear();
  return new Intl.DateTimeFormat("en-ZA",sameYear?{day:"numeric",month:"short"}:{day:"numeric",month:"short",year:"numeric"}).format(date);
}
