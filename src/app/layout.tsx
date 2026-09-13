import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import { ToastProvider } from "@/components/toast-provider";
import "./globals.css";
import "./shorts.css";

const inter = Inter({ subsets:["latin"], variable:"--font-inter" });
const montserrat = Montserrat({ subsets:["latin"], variable:"--font-sora", weight:["700","800","900"] });

export const metadata: Metadata = {
  title: { default:"TinkerTown — Your collection. Your community.", template:"%s | TinkerTown" },
  description:"South Africa's social marketplace for collectible figurines.",
  icons:{ icon:"/tinkertown-mark.svg" }
};
export const viewport: Viewport = { themeColor:"#ffffff", colorScheme:"light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth"><body className={`${inter.variable} ${montserrat.variable}`}><AuthProvider><ToastProvider>{children}</ToastProvider></AuthProvider></body></html>;
}
