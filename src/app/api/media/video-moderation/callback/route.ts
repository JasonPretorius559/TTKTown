import { createHash, timingSafeEqual } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { type SightengineResult, videoModerationDecision } from "@/lib/media-moderation";

export const runtime = "nodejs";

function matchesToken(token: string, expectedHash: unknown) {
  if (!/^[a-f0-9]{64}$/.test(token) || typeof expectedHash !== "string" || !/^[a-f0-9]{64}$/.test(expectedHash)) return false;
  const supplied = Buffer.from(createHash("sha256").update(token).digest("hex"), "hex");
  return timingSafeEqual(supplied, Buffer.from(expectedHash, "hex"));
}

export async function POST(request: NextRequest) {
  const assetId = request.nextUrl.searchParams.get("assetId") || "";
  const token = request.nextUrl.searchParams.get("token") || "";
  if (!/^[a-f0-9-]{36}$/.test(assetId)) return new NextResponse("Not found", { status: 404 });
  const ref = adminDb.collection("mediaAssets").doc(assetId);
  const snapshot = await ref.get();
  const asset = snapshot.data();
  if (!asset || !matchesToken(token, asset.moderationCallbackHash)) return new NextResponse("Unauthorized", { status: 401 });
  if (["APPROVED", "REJECTED"].includes(asset.moderationStatus)) return NextResponse.json({ received: true });
  if (!asset.moderationMediaId) return new NextResponse("Moderation submission is still being recorded", { status: 409 });

  const payload = await request.json().catch(() => null) as SightengineResult | null;
  if (!payload || typeof payload !== "object") return new NextResponse("Invalid callback", { status: 400 });
  const verdict = videoModerationDecision(payload, asset.moderationMediaId, asset.hasAudio === true);
  if (verdict.decision === "INVALID") return new NextResponse(verdict.reason, { status: 400 });
  if (verdict.decision === "PENDING") {
    await ref.update({ moderationLastCallbackAt: FieldValue.serverTimestamp(), moderationProgress: Number(payload.data?.progress || 0) });
    return NextResponse.json({ received: true });
  }

  await adminDb.runTransaction(async tx => {
    const current = await tx.get(ref);
    const value = current.data();
    if (!value || ["APPROVED", "REJECTED"].includes(value.moderationStatus)) return;
    const profileRef = adminDb.collection("users").doc(value.ownerId);
    const profile = await tx.get(profileRef);
    const draft = value.pendingPost as { caption?: string; figureId?: string | null } | undefined;
    const figure = draft?.figureId ? await tx.get(adminDb.collection("figures").doc(draft.figureId)) : null;
    const canPublish = verdict.decision === "APPROVED" && profile.exists && profile.data()?.suspended !== true && (!draft?.figureId || figure?.exists);
    const notificationRef = profileRef.collection("notifications").doc(`video_${assetId}`);
    const now = FieldValue.serverTimestamp();
    if (!canPublish) {
      const reason = verdict.decision === "REJECTED" ? verdict.reason : "The account or tagged figure is no longer available";
      tx.update(ref, { state: "DELETING", published: false, moderationStatus: "REJECTED", moderationReason: reason,
        pendingPost: FieldValue.delete(), expiresAt: Timestamp.fromMillis(Date.now() + 20 * 60_000), moderationCompletedAt: now });
      if (profile.exists) tx.set(notificationRef, { id: notificationRef.id, targetUserId: value.ownerId, type: "VIDEO_REJECTED",
        title: "Video could not be published", body: reason, href: "/home", read: false, time: "Just now", createdAt: now });
      return;
    }
    const postRef = adminDb.collection("posts").doc(assetId);
    const post = await tx.get(postRef);
    tx.update(ref, { state: "READY", published: true, moderationStatus: "APPROVED", moderationCompletedAt: now,
      fullVideoReviewed: true, audioReviewed: value.hasAudio === true, pendingPost: FieldValue.delete(), expiresAt: FieldValue.delete() });
    if (!post.exists) tx.create(postRef, {
      id: assetId, authorId: value.ownerId, author: profile.data()!.username, displayName: profile.data()!.displayName,
      avatar: profile.data()!.avatar || "/tinkertown-mark.svg", caption: draft?.caption || "", image: "", images: [], imagePathnames: [],
      mediaType: "VIDEO", videoAssetId: assetId, videoUrl: `/api/media/videos/${assetId}`, videoDuration: value.durationSeconds,
      figureId: draft?.figureId || null, audience: "PUBLIC", likes: 0, comments: 0, createdAt: now, updatedAt: now,
    });
    tx.set(notificationRef, { id: notificationRef.id, targetUserId: value.ownerId, type: "VIDEO_APPROVED", title: "Your video is live",
      body: "Your safety check finished and the video was published.", href: "/shorts", read: false, time: "Just now", createdAt: now });
  });
  return NextResponse.json({ received: true });
}
