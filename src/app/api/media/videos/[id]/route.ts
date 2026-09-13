import { head } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { adminDb, requireFirebaseUser } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export const runtime = "nodejs";
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try { user = await requireFirebaseUser(request); } catch { return new NextResponse("Unauthorized", { status: 401 }); }
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/.test(id)) return new NextResponse("Not found", { status: 404 });
  try {
    await adminDb.runTransaction(async tx => {
      const postRef = adminDb.collection("posts").doc(id); const assetRef = adminDb.collection("mediaAssets").doc(id);
      const [post, asset, profile] = await Promise.all([tx.get(postRef), tx.get(assetRef), tx.get(adminDb.collection("users").doc(user.uid))]);
      if (!asset.exists || (asset.data()?.ownerId !== user.uid && !["ADMIN","MODERATOR"].includes(profile.data()?.role))) throw new Error("Forbidden");
      if (post.exists) tx.delete(postRef);
      // Let every short-lived upload token expire before deleting the pathname.
      tx.update(assetRef, { published: false, state: "DELETING", expiresAt: Timestamp.fromMillis(Date.now() + 20 * 60_000) });
    });
    return NextResponse.json({ deleted: true });
  } catch { return new NextResponse("Forbidden", { status: 403 }); }
}
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireFirebaseUser(request); } catch { return new NextResponse("Unauthorized", { status: 401 }); }
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/.test(id)) return new NextResponse("Not found", { status: 404 });
  const [asset, post] = await Promise.all([adminDb.collection("mediaAssets").doc(id).get(), adminDb.collection("posts").doc(id).get()]);
  const media = asset.data();
  if (!post.exists || !media?.published || media.state !== "READY" || media.scope !== "video") return new NextResponse("Not found", { status: 404 });
  const range = request.headers.get("range");
  if (range && !/^bytes=\d*-\d*$/.test(range)) return new NextResponse("Invalid range", { status: 416 });
  const metadata = await head(media.pathname);
  // Private Blob requests need the server token. Relay Range and the real upstream
  // status rather than buffering entire videos for every seek.
  const upstream = await fetch(metadata.url, { headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`, ...(range ? { Range: range } : {}) }, cache: "no-store", redirect: "error", signal: request.signal });
  const headers = new Headers({ "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
  for (const key of ["Content-Type","Content-Length","Content-Range","Accept-Ranges","ETag"]) {
    const value = upstream.headers.get(key); if (value) headers.set(key, value);
  }
  return new NextResponse(upstream.body, { status: upstream.status, headers });
}
