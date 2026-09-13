import "server-only";
import { createHash } from "node:crypto";
import { put } from "@vercel/blob";
import sharp from "sharp";
import { adminDb } from "../firebase-admin";
import { moderateMedia, moderationConfigured } from "../media-moderation";
import { cleanImportedText, IMAGE_STORAGE_LIMIT } from "../media-policy";
import { reserveMedia } from "../media-storage";
import { downloadSourceImage } from "./safe-image-download";
import type { CatalogueCandidate } from "@/types";

export async function storeCandidateImage(input: CatalogueCandidate): Promise<CatalogueCandidate> {
  const previous = await adminDb.collection("catalogueCandidates").doc(input.id).get();
  if (previous.exists && previous.data()?.status !== "PENDING") return previous.data() as CatalogueCandidate;
  const candidate = { ...input, imageStatus: "HELD" as CatalogueCandidate["imageStatus"], holdReason: "" };
  for (const key of ["name","franchise","character","manufacturer","series","scale","description"] as const) candidate[key] = cleanImportedText(candidate[key], key === "description" ? 1000 : 160);
  try {
    const sources = (process.env.CATALOGUE_APPROVED_SOURCES || "").split(",").map(value => value.trim());
    if (!sources.includes(candidate.source)) throw new Error("Source is not enabled for image reuse and automatic publishing");
    const sourceHosts = (process.env.CATALOGUE_SOURCE_HOSTS || "").split(",").map(value => value.trim());
    const source = new URL(candidate.sourceUrl);
    if (source.protocol !== "https:" || !sourceHosts.includes(source.hostname)) throw new Error("Product source host is not enabled");
    if (!moderationConfigured()) throw new Error("Automated media checks are not configured. Publishing is paused.");
    const original = await downloadSourceImage(candidate.referenceImageUrl);
    // Decode, strip metadata and store one still image; source originals are not retained.
    const image = await sharp(original, { limitInputPixels: 25_000_000, animated: false }).rotate()
      .resize({ width: 1000, height: 1000, fit: "inside", withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
    if (image.length > IMAGE_STORAGE_LIMIT) throw new Error("Optimised image exceeds the 200 KB storage limit");
    await moderateMedia(image, "image/webp");
    const hash = createHash("sha256").update(image).digest("hex");
    const id = `catalogue_${hash}`; const pathname = `catalogue/approved/${hash}.webp`;
    const asset = await reserveMedia({ id, pathname, bytes: image.length, ownerId: "system", scope: "catalogue" });
    if (asset.state !== "READY") {
      await put(pathname, image, { access: "private", contentType: "image/webp", addRandomSuffix: false, allowOverwrite: false });
      await adminDb.collection("mediaAssets").doc(id).update({ state: "READY", contentType: "image/webp" });
    }
    return { ...candidate, referenceImageUrl: `/api/blob?pathname=${encodeURIComponent(pathname)}`, referenceImagePathname: pathname,
      imageAssetId: id, imageStatus: "APPROVED", imageBytes: image.length, holdReason: "" };
  } catch (error) {
    return { ...candidate, referenceImageUrl: "", referenceImagePathname: "", imageAssetId: "", imageStatus: "HELD",
      holdReason: error instanceof Error ? error.message : "Image processing failed" };
  }
}

export async function importCandidateImages(candidates: CatalogueCandidate[]) {
  const imported: CatalogueCandidate[] = [];
  const deadline = Date.now() + 200_000;
  for (let offset = 0; offset < Math.min(candidates.length, 100); offset += 3) {
    if (Date.now() > deadline) {
      imported.push(...candidates.slice(offset, 100).map(candidate => ({ ...candidate, referenceImageUrl: "", imageStatus: "HELD" as const, holdReason: "Batch time limit reached. Fetch again to continue." })));
      break;
    }
    imported.push(...await Promise.all(candidates.slice(offset, Math.min(offset + 3, 100)).map(storeCandidateImage)));
  }
  return imported;
}
