"use client";

import Link from "next/link";
import { BookOpenCheck, DatabaseZap, FileWarning, Plus, Store, Users } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { DataState, PageHeader } from "@/components/ui";
import { updateRecord, useFirestoreCollection } from "@/lib/firestore-data";
import type { FigureRequest, Listing, Report, UserProfile } from "@/types";

type Audit={id:string;action:string;actorId:string};

export default function AdminPage(){
  const {user}=useAuth();
  const users=useFirestoreCollection<UserProfile>("users",{limit:50});
  const listings=useFirestoreCollection<Listing>("listings",{where:[["status","==","ACTIVE"]],limit:50});
  const requests=useFirestoreCollection<FigureRequest>("figureRequests",{orderBy:["createdAt","desc"],limit:50});
  const reports=useFirestoreCollection<Report>("reports",{orderBy:["createdAt","desc"],limit:50});
  const audits=useFirestoreCollection<Audit>("auditLogs",{orderBy:["createdAt","desc"],limit:20});
  const [busyId,setBusyId]=useState("");const [status,setStatus]=useState("");
  const resolve=async(report:Report)=>{if(!user||busyId)return;setBusyId(report.id);setStatus("");try{await updateRecord(`reports/${report.id}`,{status:"RESOLVED",resolvedBy:user.uid});setStatus("Report resolved.")}catch(reason){setStatus(reason instanceof Error?reason.message:"Report could not be resolved. Try again.")}finally{setBusyId("")}};
  if(user?.role!=="ADMIN"&&user?.role!=="MODERATOR")return <div className="page"><div className="empty card"><h2>Staff Access Required</h2><p>Your account must have an ADMIN or MODERATOR role.</p></div></div>;
  const pending=requests.data.filter(item=>item.status==="PENDING");
  return <div className="page admin-page">
    <PageHeader eyebrow="Admin Console" title="Keep the Town Trustworthy" description="Review catalogue requests, moderate reports, and maintain the shared figure record." action={user.role==="ADMIN"?<div className="admin-header-actions"><Link className="btn btn-outline" href="/admin/imports"><DatabaseZap size={17}/>Source lookup</Link><Link className="btn btn-primary" href="/admin/figures/new"><Plus size={17}/>Add Catalogue Figure</Link></div>:null}/>
    {status&&<div className="demo-note" role="status" aria-live="polite">{status}</div>}
    <div className="stat-grid section"><div className="stat-card card"><BookOpenCheck/><strong>{pending.length}</strong><span>Pending figure requests</span></div><div className="stat-card card"><Users/><strong>{users.data.length}</strong><span>Collectors</span></div><div className="stat-card card"><Store/><strong>{listings.data.length}</strong><span>Active listings</span></div><div className="stat-card card"><FileWarning/><strong>{reports.data.filter(r=>r.status==="OPEN").length}</strong><span>Open reports</span></div></div>
    <section className="section admin-queue" id="catalogue-requests"><div className="section-head"><div><div className="eyebrow">Master catalogue</div><h2>Figure Requests</h2></div><span className="queue-count">{pending.length} waiting</span></div><DataState loading={requests.loading} error={requests.error} empty={!requests.data.length} emptyTitle="No catalogue requests" emptyText="New figure requests from sellers will appear here."><div className="catalogue-request-list">{requests.data.map(request=><article className={`catalogue-request card status-${request.status.toLowerCase()}`} key={request.id}><div className="request-status-rail"/><div className="request-main"><div className="request-title"><div><span className={`request-chip ${request.status.toLowerCase()}`}>{request.status}</span><h3>{request.name}</h3></div><span className="request-by">Requested by @{request.requesterUsername||"collector"}</span></div><dl><div><dt>Franchise</dt><dd>{request.franchise||"Not supplied"}</dd></div><div><dt>Manufacturer</dt><dd>{request.manufacturer||"Not supplied"}</dd></div></dl>{request.notes&&<p>{request.notes}</p>}</div><div className="request-action">{request.status==="PENDING"&&user.role==="ADMIN"?<Link className="btn btn-primary btn-small" href={`/admin/catalogue/${request.id}`}>Review request</Link>:<span>{request.status==="PENDING"?"Admin approval required":request.status==="APPROVED"?"Added to catalogue":"Closed"}</span>}</div></article>)}</div></DataState></section>
    <section className="section"><h2>Moderation Queue</h2><DataState loading={reports.loading} error={reports.error} empty={!reports.data.length}><div className="table-wrap card" style={{contentVisibility:"auto"}}><table className="data-table"><thead><tr><th>Target</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead><tbody>{reports.data.map(r=><tr key={r.id}><td>{r.targetType} · {r.targetId}</td><td>{r.reason}</td><td>{r.status}</td><td><button disabled={busyId===r.id} className="btn btn-outline btn-small" onClick={()=>resolve(r)}>{busyId===r.id?"Resolving…":"Resolve"}</button></td></tr>)}</tbody></table></div></DataState></section>
    <section className="section"><h2>Audit Log</h2><DataState loading={audits.loading} error={audits.error} empty={!audits.data.length}><div>{audits.data.map(a=><div className="list-card card" key={a.id}><div><strong>{a.action.replaceAll("_"," ")}</strong><p className="meta">Actor: {a.actorId}</p></div></div>)}</div></DataState></section>
  </div>;
}
