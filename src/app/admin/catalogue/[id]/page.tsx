"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { use, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { ImageUploader, type UploadedImage } from "@/components/image-uploader";
import { useToast } from "@/components/toast-provider";
import { DataState } from "@/components/ui";
import {
  approveFigureRequest,
  mergeFigureRequest,
  rejectFigureRequest,
} from "@/lib/catalogue-admin";
import {
  useFirestoreCollection,
  useFirestoreDocument,
} from "@/lib/firestore-data";
import type { Figure, FigureRequest } from "@/types";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export default function CatalogueReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const requestState = useFirestoreDocument<FigureRequest>(
    `figureRequests/${id}`,
  );
  const figures = useFirestoreCollection<Figure>("figures", { limit: 500 });
  const request = requestState.data;
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [slug, setSlug] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [canonicalFigureId, setCanonicalFigureId] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | "merge" | null>(null);
  const [error, setError] = useState("");
  if (user?.role !== "ADMIN")
    return (
      <div className="page">
        <div className="empty card">
          <ShieldCheck />
          <h2>Administrator Access Required</h2>
          <p>Only administrators can approve catalogue records.</p>
          <Link className="btn btn-outline" href="/admin">
            Return to Admin
          </Link>
        </div>
      </div>
    );
  const approve = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!request || busy) return;
    const form = new FormData(event.currentTarget);
    const finalSlug = slugify(String(form.get("slug")));
    if (figures.data.some((figure) => figure.slug === finalSlug)) {
      setError(
        "That catalogue slug already exists. Open the existing figure or choose a unique slug.",
      );
      return;
    }
    if (!images.length) {
      setError("Upload at least one verified catalogue image.");
      return;
    }
    setBusy("approve");
    setError("");
    try {
      const result = await approveFigureRequest(id, user.uid, {
        name: String(form.get("name")).trim(),
        slug: finalSlug,
        franchise: String(form.get("franchise")).trim(),
        character: String(form.get("character")).trim(),
        manufacturer: String(form.get("manufacturer")).trim(),
        series: String(form.get("series")).trim(),
        scale: String(form.get("scale")).trim(),
        releaseYear: Number(form.get("releaseYear")),
        description: String(form.get("description")).trim(),
        image: images[0].url,
        images: images.map((item) => item.url),
        imagePathnames: images.map((item) => item.pathname),
      });
      toast("Figure approved and added to the catalogue");
      router.push(`/figures/${result.slug}`);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The request could not be approved.",
      );
    } finally {
      setBusy(null);
    }
  };
  const reject = async () => {
    if (!request || busy || rejectReason.trim().length < 3) return;
    setBusy("reject");
    setError("");
    try {
      await rejectFigureRequest(id, user.uid, rejectReason);
      toast("Catalogue request rejected");
      router.push("/admin#catalogue-requests");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The request could not be rejected.",
      );
    } finally {
      setBusy(null);
    }
  };
  const merge = async () => {
    if (!request || busy || !canonicalFigureId) return;
    setBusy("merge");
    setError("");
    try {
      const result = await mergeFigureRequest(id, canonicalFigureId);
      toast(`Duplicate merged; ${result.migrated || 0} references preserved`);
      router.push(`/figures/${result.slug}`);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The duplicate could not be merged.",
      );
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="page catalogue-review-page">
      <Link className="admin-back" href="/admin#catalogue-requests">
        <ArrowLeft />
        Back to requests
      </Link>
      <DataState
        loading={requestState.loading}
        error={requestState.error}
        empty={!request}
        emptyTitle="Request not found"
        emptyText="This catalogue request may have been removed."
      >
        {request && request.status !== "PENDING" ? (
          <div className="review-closed card">
            <CheckCircle2 />
            <div>
              <span className={`request-chip ${request.status.toLowerCase()}`}>
                {request.status}
              </span>
              <h1>{request.name}</h1>
              <p>This request has already been reviewed.</p>
              {request.figureId && (
                <Link className="btn btn-primary" href={`/catalogue`}>
                  Open catalogue
                </Link>
              )}
            </div>
          </div>
        ) : (
          request && (
            <div className="catalogue-review-grid">
              <aside className="request-brief card">
                <div className="eyebrow">Collector submission</div>
                <h1>{request.name}</h1>
                <span className="request-chip pending">PENDING REVIEW</span>
                <dl>
                  <div>
                    <dt>Requested by</dt>
                    <dd>@{request.requesterUsername || "collector"}</dd>
                  </div>
                  <div>
                    <dt>Franchise</dt>
                    <dd>{request.franchise || "Not supplied"}</dd>
                  </div>
                  <div>
                    <dt>Manufacturer</dt>
                    <dd>{request.manufacturer || "Not supplied"}</dd>
                  </div>
                </dl>
                <section>
                  <h2>Collector notes</h2>
                  <p>
                    {request.notes ||
                      "No additional identification notes were supplied."}
                  </p>
                </section>
                <div className="review-principle">
                  <ShieldCheck />
                  <p>
                    Verify the exact character, manufacturer, series, scale, and
                    images before approval. This record will connect
                    collections, wishlists, and listings.
                  </p>
                </div>
              </aside>
              <main className="catalogue-desk card">
                <header>
                  <div>
                    <div className="eyebrow">Verified master record</div>
                    <h2>Create Catalogue Figure</h2>
                  </div>
                  <span>Request → Record</span>
                </header>
                {error && (
                  <div className="form-alert" role="alert">
                    {error}
                  </div>
                )}
                <form
                  className="form-stack"
                  onSubmit={approve}
                  aria-busy={Boolean(busy)}
                >
                  <div className="form-row">
                    <label>
                      <span className="label">Figure Name</span>
                      <input
                        required
                        name="name"
                        autoComplete="off"
                        className="field"
                        defaultValue={request.name}
                        onChange={(event) => {
                          if (!slug) setSlug(slugify(event.target.value));
                        }}
                      />
                    </label>
                    <label>
                      <span className="label">Slug</span>
                      <input
                        required
                        name="slug"
                        autoComplete="off"
                        spellCheck={false}
                        pattern="[a-z0-9-]+"
                        className="field"
                        value={slug || slugify(request.name)}
                        onChange={(event) =>
                          setSlug(slugify(event.target.value))
                        }
                      />
                    </label>
                  </div>
                  <div className="form-row">
                    <label>
                      <span className="label">Franchise</span>
                      <input
                        required
                        name="franchise"
                        autoComplete="off"
                        className="field"
                        defaultValue={request.franchise}
                      />
                    </label>
                    <label>
                      <span className="label">Character</span>
                      <input
                        required
                        name="character"
                        autoComplete="off"
                        className="field"
                      />
                    </label>
                  </div>
                  <div className="form-row">
                    <label>
                      <span className="label">Manufacturer</span>
                      <input
                        required
                        name="manufacturer"
                        autoComplete="off"
                        className="field"
                        defaultValue={request.manufacturer}
                      />
                    </label>
                    <label>
                      <span className="label">Series</span>
                      <input
                        name="series"
                        autoComplete="off"
                        className="field"
                      />
                    </label>
                  </div>
                  <div className="form-row">
                    <label>
                      <span className="label">Scale</span>
                      <input
                        name="scale"
                        autoComplete="off"
                        className="field"
                        placeholder="e.g. 1/6"
                      />
                    </label>
                    <label>
                      <span className="label">Release Year</span>
                      <input
                        name="releaseYear"
                        type="number"
                        min="1900"
                        max="2100"
                        inputMode="numeric"
                        className="field"
                      />
                    </label>
                  </div>
                  <div className="review-divider">
                    <span>Verified catalogue images</span>
                  </div>
                  <ImageUploader
                    value={images}
                    onChange={setImages}
                    maxImages={6}
                  />
                  <label>
                    <span className="label">Catalogue Description</span>
                    <textarea
                      required
                      name="description"
                      autoComplete="off"
                      className="field"
                      placeholder="Describe the official figure, included accessories, edition, and identifying details."
                    />
                  </label>
                  <footer className="approval-footer">
                    <span>
                      <ShieldCheck /> Verifies the existing community record
                      without changing its ID.
                    </span>
                    <button
                      className="btn btn-primary"
                      disabled={Boolean(busy)}
                    >
                      {busy === "approve"
                        ? "Approving…"
                        : "Verify Community Figure"}
                      <CheckCircle2 />
                    </button>
                  </footer>
                </form>
                <section className="rejection-panel">
                  <div>
                    <ShieldCheck />
                    <span>
                      <strong>Already in the catalogue?</strong>
                      <small>
                        Merge this submission into the verified record.
                        Collections, listings, posts, wishlists, and price
                        history will be relinked automatically.
                      </small>
                    </span>
                  </div>
                  <select
                    className="field"
                    value={canonicalFigureId}
                    onChange={(event) =>
                      setCanonicalFigureId(event.target.value)
                    }
                  >
                    <option value="">Choose the existing verified figure</option>
                    {figures.data
                      .filter(
                        (figure) =>
                          figure.id !== request.figureId &&
                          figure.moderationStatus !== "MERGED" &&
                          figure.verificationStatus !== "COMMUNITY",
                      )
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((figure) => (
                        <option key={figure.id} value={figure.id}>
                          {figure.name} · {figure.manufacturer}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={Boolean(busy) || !canonicalFigureId}
                    onClick={merge}
                  >
                    {busy === "merge" ? "Merging…" : "Merge duplicate"}
                  </button>
                </section>
                <section className="rejection-panel">
                  <div>
                    <XCircle />
                    <span>
                      <strong>Cannot verify this request?</strong>
                      <small>Explain what the collector should correct.</small>
                    </span>
                  </div>
                  <textarea
                    className="field"
                    value={rejectReason}
                    maxLength={500}
                    onChange={(event) => setRejectReason(event.target.value)}
                    placeholder="Reason for rejection…"
                  />
                  <button
                    className="btn btn-outline"
                    disabled={Boolean(busy) || rejectReason.trim().length < 3}
                    onClick={reject}
                  >
                    {busy === "reject" ? "Rejecting…" : "Reject request"}
                  </button>
                </section>
              </main>
            </div>
          )
        )}
      </DataState>
    </div>
  );
}
