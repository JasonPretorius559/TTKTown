import { get, head } from "@vercel/blob";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, requireFirebaseUser } from "@/lib/firebase-admin";
import { moderateMedia } from "@/lib/media-moderation";
import { readBoundedStream, VIDEO_STORAGE_LIMIT, VIDEO_TYPES } from "@/lib/media-policy";
import { assertAppropriateContent } from "@/lib/content-filter";

export const runtime = "nodejs";
export const maxDuration = 60;
const inputSchema = z.object({ assetId: z.string().uuid(), caption: z.string().trim().max(2000) });

export async function POST(request: NextRequest) {
  let user;
  try { user = await requireFirebaseUser(request); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  try {
    const { assetId, caption } = inputSchema.parse(await request.json());
    assertAppropriateContent([caption]);
    const ref = adminDb.collection("mediaAssets").doc(assetId);
    const [snapshot, profile] = await Promise.all([ref.get(), adminDb.collection("users").doc(user.uid).get()]);
    const asset = snapshot.data();
    if (!asset || asset.ownerId !== user.uid || asset.scope !== "video" || asset.state === "DELETING" || !profile.exists || profile.data()?.suspended === true) throw new Error("Video is unavailable");
    if (asset.published) return NextResponse.json({ postId: assetId });
    await adminDb.runTransaction(async tx => {
      const current = await tx.get(ref);
      if (!current.exists || current.data()?.state === "DELETING") throw new Error("Video has expired");
      if ((current.data()?.nextCheckAt?.toMillis() || 0) > Date.now()) throw new Error("Video checks are in progress. Please wait a minute before retrying.");
      if (Number(current.data()?.checkAttempts || 0) >= 3) throw new Error("This upload could not be approved after three attempts. Please choose a different video.");
      tx.update(ref, { checkAttempts: Number(current.data()?.checkAttempts || 0) + 1, nextCheckAt: Timestamp.fromMillis(Date.now() + 60_000) });
    });
    const metadata = await head(asset.pathname);
    if (metadata.size > VIDEO_STORAGE_LIMIT || !VIDEO_TYPES.includes(metadata.contentType)) throw new Error("Unsupported or oversized video");
    const result = await get(asset.pathname, { access: "private", abortSignal: AbortSignal.timeout(10_000) });
    if (!result || result.statusCode !== 200) throw new Error("Video upload is not complete");
    const data = await readBoundedStream(result.stream, VIDEO_STORAGE_LIMIT);
    const verdict = await moderateMedia(data, metadata.contentType);
    await adminDb.runTransaction(async tx => {
      const budgetRef = adminDb.collection("mediaBudgets").doc("video");
      const [current, budget, currentProfile] = await Promise.all([tx.get(ref), tx.get(budgetRef), tx.get(profile.ref)]);
      if (!current.exists || current.data()?.state === "DELETING") throw new Error("Video has expired");
      if (currentProfile.data()?.suspended === true) throw new Error("Account cannot publish");
      if (current.data()?.published) return;
      const now = FieldValue.serverTimestamp();
      tx.update(budgetRef, { bytes: Math.max(0, Number(budget.data()?.bytes || 0) - current.data()!.bytes + data.length) });
      tx.update(ref, { state: "READY", published: true, bytes: data.length, expiresAt: FieldValue.delete(), contentType: verdict.contentType, durationSeconds: verdict.durationSeconds,
        width: verdict.width, height: verdict.height, policyVersion: verdict.policyVersion });
      // Use asset ID as post ID so retries cannot create additional posts.
      tx.create(adminDb.collection("posts").doc(assetId), {
        id: assetId, authorId: user.uid, author: profile.data()!.username, displayName: profile.data()!.displayName,
        avatar: profile.data()!.avatar || "/tinkertown-mark.svg", caption, image: "", images: [], imagePathnames: [],
        mediaType: "VIDEO", videoAssetId: assetId, videoUrl: `/api/media/videos/${assetId}`, videoDuration: verdict.durationSeconds,
        audience: "PUBLIC", likes: 0, comments: 0, createdAt: now, updatedAt: now,
      });
    });
    return NextResponse.json({ postId: assetId });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Video could not be published" }, { status: 400 }); }
}
