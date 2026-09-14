import { get, head } from "@vercel/blob";
import { createHash, randomBytes } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, requireFirebaseUser } from "@/lib/firebase-admin";
import { submitVideoModeration } from "@/lib/media-moderation";
import { readBoundedStream, VIDEO_STORAGE_LIMIT, VIDEO_TYPES } from "@/lib/media-policy";
import { assertAppropriateContent } from "@/lib/content-filter";

export const runtime = "nodejs";
export const maxDuration = 300;
const inputSchema = z.object({ assetId: z.string().uuid(), caption: z.string().trim().max(2000), figureId: z.string().trim().max(128).nullable().optional() });

export async function POST(request: NextRequest) {
  let user;
  try { user = await requireFirebaseUser(request); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  try {
    const { assetId, caption, figureId } = inputSchema.parse(await request.json());
    assertAppropriateContent([caption]);
    const ref = adminDb.collection("mediaAssets").doc(assetId);
    const [snapshot, profile, figure] = await Promise.all([ref.get(), adminDb.collection("users").doc(user.uid).get(), figureId ? adminDb.collection("figures").doc(figureId).get() : null]);
    const asset = snapshot.data();
    if (!asset || asset.ownerId !== user.uid || asset.scope !== "video" || asset.state === "DELETING" || !profile.exists || profile.data()?.suspended === true) throw new Error("Video is unavailable");
    if (figureId && !figure?.exists) throw new Error("The tagged figure is unavailable");
    if (asset.published) return NextResponse.json({ postId: assetId });
    if (asset.moderationStatus === "PROCESSING" && asset.moderationMediaId) return NextResponse.json({ assetId, status: "PROCESSING" }, { status: 202 });
    if (asset.moderationStatus === "REJECTED") throw new Error("This video did not pass the community safety checks.");
    await adminDb.runTransaction(async tx => {
      const current = await tx.get(ref);
      if (!current.exists || current.data()?.state === "DELETING") throw new Error("Video has expired");
      if ((current.data()?.nextCheckAt?.toMillis() || 0) > Date.now()) throw new Error("Video checks are in progress. Please wait a minute before retrying.");
      if (Number(current.data()?.checkAttempts || 0) >= 3) throw new Error("This upload could not be approved after three attempts. Please choose a different video.");
      tx.update(ref, { checkAttempts: Number(current.data()?.checkAttempts || 0) + 1, nextCheckAt: Timestamp.fromMillis(Date.now() + 60_000) });
    });
    const metadata = await head(asset.pathname);
    if (metadata.size > VIDEO_STORAGE_LIMIT || !VIDEO_TYPES.includes(metadata.contentType)) throw new Error("Unsupported or oversized video");
    const result = await get(asset.pathname, { access: "private", abortSignal: AbortSignal.timeout(60_000) });
    if (!result || result.statusCode !== 200) throw new Error("Video upload is not complete");
    const data = await readBoundedStream(result.stream, VIDEO_STORAGE_LIMIT);
    const callbackToken = randomBytes(32).toString("hex");
    const callbackUrl = new URL("/api/media/video-moderation/callback", request.nextUrl.origin);
    callbackUrl.searchParams.set("assetId", assetId);
    callbackUrl.searchParams.set("token", callbackToken);
    await ref.update({ moderationStatus: "SUBMITTING", moderationCallbackHash: createHash("sha256").update(callbackToken).digest("hex"),
      pendingPost: { caption, figureId: figureId || null } });
    const verdict = await submitVideoModeration(data, callbackUrl.toString());
    await adminDb.runTransaction(async tx => {
      const budgetRef = adminDb.collection("mediaBudgets").doc("video");
      const [current, budget] = await Promise.all([tx.get(ref), tx.get(budgetRef)]);
      if (!current.exists || current.data()?.state === "DELETING") throw new Error("Video has expired");
      if (current.data()?.published) return;
      tx.update(budgetRef, { bytes: Math.max(0, Number(budget.data()?.bytes || 0) - current.data()!.bytes + data.length) });
      tx.update(ref, { state: "MODERATING", moderationStatus: "PROCESSING", moderationMediaId: verdict.requestId, bytes: data.length,
        contentType: verdict.contentType, durationSeconds: verdict.durationSeconds, width: verdict.width, height: verdict.height,
        hasAudio: verdict.hasAudio, sha256: verdict.sha256, policyVersion: verdict.policyVersion });
    });
    return NextResponse.json({ assetId, status: "PROCESSING" }, { status: 202 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Video could not be published" }, { status: 400 }); }
}
