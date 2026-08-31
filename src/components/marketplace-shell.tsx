"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Store } from "lucide-react";
import { cn } from "@/lib/utils";

const marketNav = [
  ["/marketplace", "Browse", Store],
  ["/marketplace/selling", "My listings", ClipboardList],
] as const;

export function MarketplaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const active = (href: string) => href === "/marketplace" ? pathname === href : pathname.startsWith(href);

  return <section className="market-environment">
    <header className="market-canopy">
      <div className="market-canopy-inner">
        <div className="market-identity">
          <Link href="/marketplace" className="market-wordmark"><Store size={23}/><span><small>TinkerTown</small>Marketplace</span></Link>
        </div>
        <nav className="market-nav" aria-label="Marketplace navigation">
          {marketNav.map(([href,label,Icon]) => <Link key={href} href={href} aria-current={active(href)?"page":undefined} className={cn(active(href)&&"active")}><Icon size={16}/>{label}</Link>)}
        </nav>
      </div>
    </header>
    <div className="market-awning" aria-hidden="true"/>
    <div className="market-content">{children}</div>
  </section>;
}
