import "server-only";
import { lookup } from "node:dns/promises";
import { BlockList } from "node:net";
import { request } from "node:https";
import { IMAGE_DOWNLOAD_LIMIT } from "../media-policy";
import { catalogueImageHosts } from "./source-policy";

const blocked = new BlockList();
for (const [network, prefix] of [["0.0.0.0",8],["10.0.0.0",8],["100.64.0.0",10],["127.0.0.0",8],["169.254.0.0",16],["172.16.0.0",12],["192.0.0.0",24],["192.0.2.0",24],["192.168.0.0",16],["198.18.0.0",15],["198.51.100.0",24],["203.0.113.0",24],["224.0.0.0",4],["240.0.0.0",4]] as const) blocked.addSubnet(network, prefix);

export function sourceImageHeaders(url: URL) {
  return { Host: url.hostname, Accept: "image/jpeg,image/png,image/webp",
    "User-Agent": "Mozilla/5.0 (compatible; TinkerTown-ImageImport/1.0; +https://tinkertown.app)",
    ...(url.hostname === "static.wikia.nocookie.net" ? { Referer: "https://pokemon.fandom.com/" } : {}) };
}

export async function downloadSourceImage(value: string, redirects = 0): Promise<Buffer> {
  const url = new URL(value);
  const hosts = catalogueImageHosts();
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") || !hosts.has(url.hostname)) throw new Error("Image host is not enabled");
  const addresses = (await lookup(url.hostname, { family: 4, all: true, verbatim: true })).map(result => result.address);
  if (!addresses.length || addresses.some(address => blocked.check(address))) throw new Error("Image host resolves to a restricted address");
  // Pin the checked IP while retaining TLS hostname verification; no DNS rebinding.
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => req.destroy(new Error("Image download timed out")), 15_000);
    const req = request({ hostname: addresses[0], servername: url.hostname, path: url.pathname + url.search,
      method: "GET", headers: sourceImageHeaders(url) }, response => {
      if ([301,302,303,307,308].includes(response.statusCode || 0)) {
        response.resume(); clearTimeout(timer);
        if (redirects >= 2 || !response.headers.location) { reject(new Error("Image redirect limit reached")); return; }
        downloadSourceImage(new URL(response.headers.location, url).href, redirects + 1).then(resolve, reject); return;
      }
      if (response.statusCode !== 200 || !["image/jpeg","image/png","image/webp"].includes((response.headers["content-type"] || "").split(";")[0])
        || Number(response.headers["content-length"] || 0) > IMAGE_DOWNLOAD_LIMIT) {
        response.destroy(); clearTimeout(timer); reject(new Error("Unsupported or oversized source image")); return;
      }
      let size = 0; const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > IMAGE_DOWNLOAD_LIMIT) { req.destroy(new Error("Image download limit exceeded")); return; }
        chunks.push(chunk);
      });
      response.on("error", error => { clearTimeout(timer); reject(error); });
      response.on("end", () => { clearTimeout(timer); if (!size) reject(new Error("Empty image")); else resolve(Buffer.concat(chunks)); });
    });
    req.on("error", error => { clearTimeout(timer); reject(error); }); req.end();
  });
}
