import type { CatalogueCandidate, Figure } from "@/types";

export type AutoApprovalPlan = {
  candidate: CatalogueCandidate;
  figureId: string;
  slug: string;
  imageUrl: string;
};

export type AutoApprovalResult = {
  ready: AutoApprovalPlan[];
  duplicates: Array<{ candidate: CatalogueCandidate; figureId: string }>;
  held: CatalogueCandidate[];
};

function normalized(value: string | null | undefined) {
  return (value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function identityKey(value: Pick<CatalogueCandidate | Figure, "name" | "manufacturer" | "series" | "scale" | "releaseYear">) {
  return [value.manufacturer, value.name, value.series, value.scale, String(value.releaseYear || "")].map(normalized).join("|");
}

function validHttpsUrl(value: string) {
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

function publishableImage(candidate:CatalogueCandidate){
  if(candidate.imageStatus!=="APPROVED" || !candidate.imageAssetId || !candidate.referenceImagePathname?.startsWith("catalogue/approved/"))return "";
  return candidate.referenceImageUrl===`/api/blob?pathname=${encodeURIComponent(candidate.referenceImagePathname)}`?candidate.referenceImageUrl:"";
}

export function catalogueSlug(value: string, suffix: string) {
  const base = value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "catalogue-figure";
  return `${base}-${suffix.toLowerCase().replace(/[^a-z0-9]/g, "").slice(-8)}`;
}

export function planAutomaticApprovals(candidates: CatalogueCandidate[], figures: Figure[]): AutoApprovalResult {
  const existingByIdentity = new Map(figures.map(figure => [identityKey(figure), figure.id]));
  const plannedByIdentity = new Map<string, string>();
  const result: AutoApprovalResult = { ready: [], duplicates: [], held: [] };

  for (const candidate of candidates) {
    if (candidate.status !== "PENDING") continue;
    const imageUrl=publishableImage(candidate);
    const complete = [candidate.name, candidate.franchise, candidate.character, candidate.manufacturer, candidate.description].every(value => normalized(value).length > 0)
      && validHttpsUrl(candidate.sourceUrl)
      && Boolean(imageUrl)
      && !candidate.possibleDuplicateIds?.length;
    if (!complete) { result.held.push(candidate); continue; }

    const key = identityKey(candidate);
    const duplicateFigureId = existingByIdentity.get(key) || plannedByIdentity.get(key);
    if (duplicateFigureId) {
      result.duplicates.push({ candidate, figureId: duplicateFigureId });
      continue;
    }

    const figureId = `catalogue_${candidate.id}`;
    result.ready.push({ candidate, figureId, slug: catalogueSlug(candidate.name, candidate.id), imageUrl });
    plannedByIdentity.set(key, figureId);
  }
  return result;
}
