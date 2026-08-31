import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com" }
      ,{ protocol: "https", hostname: "lh3.googleusercontent.com" }
      ,{ protocol: "https", hostname: "www.lego.com" }
      ,{ protocol: "https", hostname: "shop.mattel.com" }
      ,{ protocol: "https", hostname: "cdn.shopify.com" }
      ,{ protocol: "https", hostname: "funko.com" }
      ,{ protocol: "https", hostname: "cdn.media.amplience.net" }
      ,{ protocol: "https", hostname: "cdn11.bigcommerce.com" }
      ,{ protocol: "https", hostname: "tamashiiweb.com" }
      ,{ protocol: "https", hostname: "www.sideshow.com" }
      ,{ protocol: "https", hostname: "static.wikia.nocookie.net" }
    ]
  }
};

export default nextConfig;
