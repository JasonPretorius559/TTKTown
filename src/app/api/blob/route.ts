import { get } from "@vercel/blob";
import { type NextRequest, NextResponse } from "next/server";
import { adminDb, requireFirebaseUser } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  let user;
  try { user = await requireFirebaseUser(request); }
  catch { return new NextResponse("Unauthorized", { status:401 }); }

  const pathname = request.nextUrl.searchParams.get("pathname");
  if (!pathname) return NextResponse.json({ error:"Missing pathname" }, { status:400 });
  // Accept canonical local paths only. A full Blob URL or encoded traversal must
  // never bypass the separate video publication gate.
  if (!/^(images|catalogue)\/[a-zA-Z0-9/_. -]+$/.test(pathname) || pathname.split("/").some(part => part === ".." || part === ".")) return new NextResponse("Not found", { status:404 });
  if (pathname.startsWith("catalogue/approved/")) {
    const hash = /^catalogue\/approved\/([a-f0-9]{64})\.webp$/.exec(pathname)?.[1];
    if (!hash) return new NextResponse("Not found", { status:404 });
    const asset = await adminDb.collection("mediaAssets").doc(`catalogue_${hash}`).get();
    if (asset.data()?.state !== "READY") return new NextResponse("Not found", { status:404 });
    if (!asset.data()?.published) {
      const profile = await adminDb.collection("users").doc(user.uid).get();
      if (!["ADMIN","MODERATOR"].includes(profile.data()?.role)) return new NextResponse("Not found", { status:404 });
    }
  }
  const result = await get(pathname, { access:"private", ifNoneMatch:request.headers.get("if-none-match") ?? undefined });
  if (!result) return new NextResponse("Not found", { status:404 });
  if (result.statusCode === 304) return new NextResponse(null, { status:304, headers:{ ETag:result.blob.etag, "Cache-Control":"private, no-cache" } });
  if (result.statusCode !== 200 || !result.stream) return new NextResponse("Not found", { status:404 });
  return new NextResponse(result.stream, { headers:{
    "Cache-Control":"private, no-cache", "Content-Type":result.blob.contentType,
    "X-Content-Type-Options":"nosniff", ETag:result.blob.etag
  }});
}
