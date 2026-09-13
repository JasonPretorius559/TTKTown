import { timingSafeEqual } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { discardMedia } from "@/lib/media-storage";

export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: NextRequest) {
  const expected = Buffer.from(`Bearer ${process.env.CRON_SECRET || ""}`);
  const supplied = Buffer.from(request.headers.get("authorization") || "");
  if (!process.env.CRON_SECRET || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return new NextResponse("Unauthorized", { status: 401 });
  const expired = await adminDb.collection("mediaAssets").where("expiresAt", "<=", Timestamp.now()).orderBy("expiresAt").limit(100).get();
  let deleted = 0;
  for (const doc of expired.docs) {
    if (doc.data().published) {
      // Remove the expiry field after publication so published media cannot starve cleanup.
      await adminDb.runTransaction(async tx => {
        const current = await tx.get(doc.ref);
        if (current.data()?.published) tx.update(doc.ref, { expiresAt: FieldValue.delete() });
      }); continue;
    }
    try { await discardMedia(doc.id, true); deleted++; } catch { /* Preserve reservation; retry next run. */ }
  }
  const held = await adminDb.collection("catalogueCandidates").where("expiresAt", "<=", Timestamp.now()).limit(100).get();
  for (const doc of held.docs) await adminDb.runTransaction(async tx => {
    const current = await tx.get(doc.ref);
    if (current.data()?.status === "PENDING" && current.data()?.expiresAt?.toMillis() <= Date.now()) tx.delete(doc.ref);
  });
  return NextResponse.json({ examined: expired.size, deleted, expiredCandidates: held.size });
}
