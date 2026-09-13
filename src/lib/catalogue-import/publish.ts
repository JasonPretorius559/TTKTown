import "server-only";
import { createHash } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "../firebase-admin";
import { planAutomaticApprovals } from "../catalogue-auto-approval";
import { assertAppropriateContent } from "../content-filter";
import type { CatalogueCandidate } from "@/types";

export async function publishImport(actorId: string, runId: string, candidates: CatalogueCandidate[]) {
  const summary = { approved: 0, duplicates: 0, held: 0 };
  for (const candidate of candidates.slice(0, 100)) {
    const outcome = await adminDb.runTransaction(async tx => {
      const ref = adminDb.collection("catalogueCandidates").doc(candidate.id);
      const previous = await tx.get(ref);
      if (previous.exists && previous.data()?.status !== "PENDING") return previous.data()?.status === "APPROVED" ? "approved" : "duplicates";
      const identity = [candidate.manufacturer, candidate.name, candidate.series, candidate.scale, candidate.releaseYear || ""].map(value => String(value).trim().toLowerCase()).join("|");
      const key = createHash("sha256").update(identity).digest("hex");
      const identityRef = adminDb.collection("catalogueIdentities").doc(key);
      const identityDoc = await tx.get(identityRef);
      const existingFigures = await tx.get(adminDb.collection("figures").where("name", "==", candidate.name).limit(50));
      const duplicate = identityDoc.data()?.figureId || existingFigures.docs.find(doc => {
        const figure = doc.data(); return figure.manufacturer === candidate.manufacturer && figure.series === candidate.series && figure.scale === candidate.scale && (figure.releaseYear || null) === (candidate.releaseYear || null);
      })?.id;
      const assetRef = candidate.imageAssetId ? adminDb.collection("mediaAssets").doc(candidate.imageAssetId) : null;
      const asset = assetRef ? await tx.get(assetRef) : null;
      const now = FieldValue.serverTimestamp();
      const staged = { ...candidate, updatedAt: now, lastSeenAt: now, createdAt: previous.data()?.createdAt || now };
      if (duplicate) {
        tx.set(ref, { ...staged, status: "DUPLICATE", figureId: duplicate, approvalMode: "AUTOMATIC" }); return "duplicates";
      }
      const ready = planAutomaticApprovals([candidate], []).ready[0];
      let safeText = true;
      try { assertAppropriateContent([candidate.name, candidate.description, candidate.franchise]); } catch { safeText = false; }
      if (!ready || !safeText || asset?.data()?.state !== "READY") {
        tx.set(ref, { ...staged, status: "PENDING", expiresAt: Timestamp.fromMillis(Date.now() + 7 * 86400_000), holdReason: candidate.holdReason || "Incomplete identity or image checks" }); return "held";
      }
      const figureId = `catalogue_${key}`;
      tx.create(adminDb.collection("figures").doc(figureId), {
        id: figureId, slug: ready.slug, name: candidate.name, franchise: candidate.franchise, character: candidate.character,
        manufacturer: candidate.manufacturer, series: candidate.series, scale: candidate.scale, releaseYear: candidate.releaseYear || 0,
        description: candidate.description, image: ready.imageUrl, images: [ready.imageUrl], imagePathnames: [candidate.referenceImagePathname],
        owned: 0, wanted: 0, verificationStatus: "COMMUNITY", moderationStatus: "APPROVED", approvalMode: "AUTOMATIC",
        sources: [{ source: candidate.source, sourceId: candidate.sourceId, sourceUrl: candidate.sourceUrl, sourceLicense: candidate.sourceLicense || "" }],
        createdAt: now, updatedAt: now,
      });
      tx.set(identityRef, { figureId });
      tx.update(assetRef!, { published: true, expiresAt: FieldValue.delete() });
      tx.set(ref, { ...staged, status: "APPROVED", figureId, approvalMode: "AUTOMATIC", reviewedBy: actorId, reviewedAt: now });
      return "approved";
    });
    summary[outcome]++;
  }
  await adminDb.collection("catalogueImportRuns").doc(runId).set({ id: runId, source: candidates[0]?.source || "WEB", franchise: "Multi-franchise",
    status: "COMPLETED", staged: candidates.length, ...summary, createdBy: actorId, createdAt: FieldValue.serverTimestamp(), completedAt: FieldValue.serverTimestamp() });
  return summary;
}
