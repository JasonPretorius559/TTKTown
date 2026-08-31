import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import { ToastProvider } from "@/components/toast-provider";
import "./globals.css";

const manrope = Manrope({ subsets:["latin"], variable:"--font-manrope" });

export const metadata: Metadata = {
  title: { default:"TinkerTown — Your collection. Your community.", template:"%s | TinkerTown" },
  description:"South Africa's social marketplace for collectible figurines.",
  icons:{ icon:"/tinkertown-mark.svg" }
};
export const viewport: Viewport = { themeColor:"#f8f5ee", colorScheme:"light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth"><body className={manrope.variable}><AuthProvider><ToastProvider>{children}</ToastProvider></AuthProvider></body></html>;
}
