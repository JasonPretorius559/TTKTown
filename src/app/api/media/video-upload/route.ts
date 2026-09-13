import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { adminDb, requireFirebaseUser } from "@/lib/firebase-admin";
import { moderationConfigured } from "@/lib/media-moderation";
import { consumeUploadAllowance, reserveMedia } from "@/lib/media-storage";
import { VIDEO_STORAGE_LIMIT, VIDEO_TYPES } from "@/lib/media-policy";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as HandleUploadBody;
    // This route does not use callbacks; finalisation validates the actual stored file.
    if (body.type !== "blob.generate-client-token") return NextResponse.json({ error: "Unsupported request" }, { status: 400 });
    let user;
    try { user = await requireFirebaseUser(request); }
    catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
    const profile = await adminDb.collection("users").doc(user.uid).get();
    if (!profile.exists || profile.data()?.suspended === true) return NextResponse.json({ error: "Account cannot upload" }, { status: 403 });
    if (!moderationConfigured()) return NextResponse.json({ error: "Video safety checks are not configured yet. Please try again later." }, { status: 503 });
    const result = await handleUpload({ request, body, onBeforeGenerateToken: async pathname => {
      const match = /^videos\/([^/]+)\/([a-f0-9-]{36})\.mp4$/.exec(pathname);
      if (!match || match[1] !== user.uid) throw new Error("Invalid video upload path");
      await consumeUploadAllowance(user.uid);
      await reserveMedia({ id: match[2], pathname, bytes: VIDEO_STORAGE_LIMIT, ownerId: user.uid, scope: "video" });
      return { allowedContentTypes: VIDEO_TYPES, maximumSizeInBytes: VIDEO_STORAGE_LIMIT, addRandomSuffix: false,
        allowOverwrite: false, validUntil: Date.now() + 10 * 60_000, tokenPayload: JSON.stringify({ ownerId: user.uid }), cacheControlMaxAge: 0 };
    }, onUploadCompleted: async () => undefined });
    return NextResponse.json(result);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 400 }); }
}
