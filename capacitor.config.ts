import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "za.co.tinkertown.app",
  appName: "TinkerTown",
  webDir: "mobile-shell",
  server: {
    url: "https://ttk-town.vercel.app",
    cleartext: false,
    allowNavigation: ["ttk-town.vercel.app"],
  },
  android: {
    backgroundColor: "#ffffff",
    allowMixedContent: false,
  },
};

export default config;
