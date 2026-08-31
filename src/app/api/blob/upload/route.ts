import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { requireFirebaseUser } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json() as HandleUploadBody;
  let ownerId = "";
  if (body.type === "blob.generate-client-token") {
    try { ownerId = (await requireFirebaseUser(request)).uid; }
    catch { return NextResponse.json({ error:"Unauthorized" }, { status:401 }); }
  }

  try {
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async pathname => {
        if (!pathname.startsWith(`images/${ownerId}/`)) throw new Error("Invalid upload path");
        return {
          allowedContentTypes:["image/jpeg", "image/png", "image/webp"],
          maximumSizeInBytes:2 * 1024 * 1024,
          addRandomSuffix:true,
          tokenPayload:JSON.stringify({ ownerId }),
          callbackUrl:undefined,
          validUntil:Date.now() + 10 * 60 * 1000,
          cacheControlMaxAge:0,
          allowOverwrite:false
        };
      },
      onUploadCompleted: async () => undefined
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error:error instanceof Error ? error.message : "Upload failed" }, { status:400 });
  }
}
