"use client";

import { CheckCircle2, X } from "lucide-react";
import { createContext, useCallback, useContext, useState } from "react";

type Toast={id:string;message:string};
const ToastContext=createContext<((message:string)=>void)|null>(null);

export function ToastProvider({children}:{children:React.ReactNode}){
  const [toasts,setToasts]=useState<Toast[]>([]);
  const show=useCallback((message:string)=>{const id=crypto.randomUUID();setToasts(current=>[...current,{id,message}]);window.setTimeout(()=>setToasts(current=>current.filter(item=>item.id!==id)),3600)},[]);
  return <ToastContext.Provider value={show}>{children}<div className="toast-stack" aria-live="polite" aria-atomic="false">{toasts.map(item=><div className="app-toast" role="status" key={item.id}><CheckCircle2 size={17}/><span>{item.message}</span><button onClick={()=>setToasts(current=>current.filter(toast=>toast.id!==item.id))} aria-label="Dismiss notification"><X size={15}/></button></div>)}</div></ToastContext.Provider>;
}

export function useToast(){const value=useContext(ToastContext);if(!value)throw new Error("useToast must be used inside ToastProvider");return value}
