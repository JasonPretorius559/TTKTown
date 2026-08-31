"use client";

import Link from "next/link";
import { CheckCheck } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { DataState, PageHeader } from "@/components/ui";
import { updateRecord, useFirestoreCollection } from "@/lib/firestore-data";
import type { NotificationItem } from "@/types";

export default function NotificationsPage(){
  const {user}=useAuth();const state=useFirestoreCollection<NotificationItem>(user?`users/${user.uid}/notifications`:"",{orderBy:["createdAt","desc"],limit:50});const [busy,setBusy]=useState(false);const [status,setStatus]=useState("");
  const markAll=async()=>{if(busy)return;setBusy(true);setStatus("");try{await Promise.all(state.data.filter(item=>!item.read).map(item=>updateRecord(`users/${user?.uid}/notifications/${item.id}`,{read:true,readAt:new Date()})));setStatus("All notifications marked as read.")}catch(reason){setStatus(reason instanceof Error?reason.message:"Notifications could not be updated. Try again.")}finally{setBusy(false)}};
  return <div className="page"><PageHeader eyebrow="Activity" title="Notifications" description="Live account activity from Firestore." action={<button disabled={busy} className="btn btn-outline" onClick={markAll}><CheckCheck size={17}/>{busy?"Updating…":"Mark All Read"}</button>}/>{status&&<div className="demo-note" role="status" aria-live="polite">{status}</div>}<DataState loading={state.loading} error={state.error} empty={!state.data.length}><div style={{contentVisibility:"auto"}}>{state.data.map(item=>item.href?<Link className="list-card card" href={item.href} key={item.id}><div className="list-card-copy"><h3>{item.title}</h3><p>{item.body}</p></div>{!item.read&&<span className="badge badge-plum">New</span>}</Link>:<article className="list-card card" key={item.id}><div className="list-card-copy"><h3>{item.title}</h3><p>{item.body}</p></div>{!item.read&&<span className="badge badge-plum">New</span>}</article>)}</div></DataState></div>;
}
