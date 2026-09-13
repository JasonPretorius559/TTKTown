import "server-only";
import { del } from "@vercel/blob";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";
import { positiveLimit } from "./media-policy";

export type MediaAsset = {
  id: string; pathname: string; bytes: number; ownerId: string; scope: "catalogue" | "video";
  state: "RESERVED" | "READY" | "DELETING"; published: boolean; expiresAt: Timestamp;
  contentType?: string; durationSeconds?: number; width?: number; height?: number;
};
export function storageBudget(scope: MediaAsset["scope"]) {
  return scope === "catalogue" ? positiveLimit(process.env.CATALOGUE_STORAGE_BYTES, 2_000_000_000)
    : positiveLimit(process.env.VIDEO_STORAGE_BYTES, 5_000_000_000);
}

export async function reserveMedia(asset: Pick<MediaAsset, "id" | "pathname" | "bytes" | "ownerId" | "scope">) {
  const ref = adminDb.collection("mediaAssets").doc(asset.id);
  const budget = adminDb.collection("mediaBudgets").doc(asset.scope);
  return adminDb.runTransaction(async tx => {
    const [existing, usage] = await Promise.all([tx.get(ref), tx.get(budget)]);
    if (existing.exists) {
      const current = existing.data() as MediaAsset;
      if (current.state !== "READY") throw new Error("Media is already being processed. Try again later.");
      return current;
    }
    const bytes = Number(usage.data()?.bytes || 0);
    if (bytes + asset.bytes > storageBudget(asset.scope)) throw new Error("Media storage budget reached. New imports and uploads are paused.");
    const value: MediaAsset = { ...asset, state: "RESERVED", published: false, expiresAt: Timestamp.fromMillis(Date.now() + 7 * 86400_000) };
    tx.set(budget, { bytes: bytes + asset.bytes }, { merge: true });
    tx.create(ref, value);
    return value;
  });
}

// Claim deletion before removing bytes; publication checks READY in a transaction.
// Never release capacity until deletion succeeds. A failed deletion is retried by cleanup.
export async function discardMedia(id: string, onlyIfExpired = false) {
  const ref = adminDb.collection("mediaAssets").doc(id);
  const asset = await adminDb.runTransaction(async tx => {
    const snapshot = await tx.get(ref);
    const value = snapshot.data() as MediaAsset | undefined;
    if (!value || value.published || (onlyIfExpired && (!value.expiresAt || value.expiresAt.toMillis() > Date.now()))) return null;
    tx.update(ref, { state: "DELETING" });
    return value;
  });
  if (!asset) return;
  await del(asset.pathname);
  await adminDb.runTransaction(async tx => {
    const budget = adminDb.collection("mediaBudgets").doc(asset.scope);
    const [snapshot, usage] = await Promise.all([tx.get(ref), tx.get(budget)]);
    if (!snapshot.exists || snapshot.data()?.state !== "DELETING") return;
    tx.update(budget, { bytes: Math.max(0, Number(usage.data()?.bytes || 0) - asset.bytes) });
    tx.delete(ref);
  });
}

export async function consumeUploadAllowance(ownerId: string) {
  const ref = adminDb.collection("mediaUploadLimits").doc(ownerId);
  await adminDb.runTransaction(async tx => {
    const snapshot = await tx.get(ref);
    const day = new Date().toISOString().slice(0, 10);
    const count = snapshot.data()?.day === day ? Number(snapshot.data()?.count || 0) : 0;
    if (count >= 5) throw new Error("Daily video upload limit reached. Try again tomorrow.");
    tx.set(ref, { day, count: count + 1 });
  });
}
