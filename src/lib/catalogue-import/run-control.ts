import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "../firebase-admin";

export async function acquireImportSlot() {
  const ref = adminDb.collection("importControls").doc("source-import");
  await adminDb.runTransaction(async tx => {
    const existing = await tx.get(ref);
    if ((existing.data()?.nextRunAt?.toMillis() || 0) > Date.now()) throw new Error("An import was started recently. Wait five minutes before fetching another batch.");
    tx.set(ref, { nextRunAt: Timestamp.fromMillis(Date.now() + 5 * 60_000) });
  });
}
