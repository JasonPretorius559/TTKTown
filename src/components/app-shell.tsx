"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Bell, Compass, Grid2X2, Home, Menu, MessageCircle, Package, Search, Settings, ShoppingBag, Store, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { AccountMenu, GlobalSearch } from "@/components/shell-overlays";
import { useFirestoreCollection } from "@/lib/firestore-data";
import { cn } from "@/lib/utils";
import type { NotificationItem } from "@/types";

const nav = [
  ["Discover",[["/home","Home",Home],["/discover","Discover",Compass],["/catalogue","Catalogue",Grid2X2],["/marketplace","Marketplace",Store]]],
  ["Your collection",[["/collection","Collection",Package]]],
  ["Activity",[["/messages","Messages",MessageCircle],["/orders","Orders",ShoppingBag]]]
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const router = useRouter(); const { user, loading, logout } = useAuth();
  const [searchOpen,setSearchOpen]=useState(false);const closeSearch=useCallback(()=>setSearchOpen(false),[]);
  const { data:notifications } = useFirestoreCollection<NotificationItem>(user ? `users/${user.uid}/notifications` : "", { where:[["read", "==", false]], limit:20 });
  const active = (href: string) => pathname === href || (href !== "/home" && pathname.startsWith(href));
  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [loading, router, user]);
  useEffect(()=>{const shortcut=(event:KeyboardEvent)=>{const target=event.target as HTMLElement;const typing=["INPUT","TEXTAREA","SELECT"].includes(target.tagName)||target.isContentEditable;if((event.key==="/"&&!typing)||((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k")){event.preventDefault();setSearchOpen(true)}};document.addEventListener("keydown",shortcut);return()=>document.removeEventListener("keydown",shortcut)},[]);
  if (loading || !user) return <div className="not-found" role="status" aria-live="polite"><div><Image src="/tinkertown-mark.svg" alt="TinkerTown" width={72} height={72}/><h2>Opening the Town…</h2></div></div>;
  return <div className="app-shell"><a className="skip-link" href="#main-content">Skip to Main Content</a>
    <aside className="app-sidebar">
      <Link href="/home" className="side-logo"><Image src="/tinkertown-mark.svg" alt="" width={38} height={38} priority /><strong>TinkerTown</strong></Link>
      <nav className="side-nav" aria-label="Primary navigation">
        {nav.map(([group,items])=><div className="side-group" key={group}><div className="side-label">{group}</div>{items.map(([href,label,Icon]) => <Link key={href} href={href} aria-current={active(href)?"page":undefined} className={cn("side-link",active(href)&&"active")}><Icon size={18}/>{label}{label==="Messages"&&notifications.length>0&&<span>{notifications.length}</span>}</Link>)}</div>)}
      </nav>
      <div className="side-bottom">
        {user?.role === "ADMIN" && <Link href="/admin" className={cn("side-link",active("/admin")&&"active")}><Settings size={18}/>Admin</Link>}
        <Link href={user?.username ? `/profile/${user.username}` : "/onboarding"} className="side-profile">
          <Image className="avatar" src={user?.avatar || "/tinkertown-mark.svg"} alt="" width={38} height={38}/>
          <div><strong style={{fontSize:12,display:"block"}}>{user?.displayName ?? "Collector"}</strong><span style={{fontSize:10,color:"#cbbfc4"}}>@{user?.username ?? "collector"}</span></div>
        </Link>
      </div>
    </aside>
    <div className="main-wrap">
      <header className="topbar">
        <button className="icon-btn" aria-label="Open menu" style={{display:"none"}}><Menu size={20}/></button>
        <div className="top-actions">
          <button className="icon-btn search-trigger" aria-label="Search TinkerTown" title="Search · Ctrl K" onClick={()=>setSearchOpen(true)}><Search size={19}/></button>
          <Link href="/marketplace/sell" className="btn btn-primary btn-small">Sell a Figure</Link>
          <Link href="/notifications" className="icon-btn" aria-label="Notifications"><Bell size={19}/>{notifications.some(n=>!n.read)&&<i className="notification-dot"/>}</Link>
          <AccountMenu user={user} logout={logout}/>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>{children}</main>
    </div>
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {[["/home","Home",Home],["/catalogue","Figures",Grid2X2],["/marketplace","Market",Store],["/messages","Chat",MessageCircle],[user?.username ? `/profile/${user.username}` : "/onboarding","Profile",UserRound]] .map(([href,label,Icon])=><Link key={href as string} href={href as string} aria-current={active(href as string)?"page":undefined} className={active(href as string)?"active":""}><Icon size={20}/><span>{label as string}</span></Link>)}
    </nav>
    <GlobalSearch open={searchOpen} onClose={closeSearch}/>
  </div>;
}
