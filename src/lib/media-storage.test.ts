import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({ docs: new Map<string, Record<string, unknown>>(), queue: Promise.resolve(), del: vi.fn() }));
vi.mock("@vercel/blob", () => ({ del: state.del }));
vi.mock("./firebase-admin", () => ({ adminDb: {
  collection: (name: string) => ({ doc: (id: string) => `${name}/${id}` }),
  runTransaction: (callback: (tx: unknown) => Promise<unknown>) => {
    const run = state.queue.then(() => callback({
      get: async (ref: string) => ({ exists: state.docs.has(ref), data: () => state.docs.get(ref) }),
      set: (ref: string, value: Record<string, unknown>) => state.docs.set(ref, { ...state.docs.get(ref), ...value }),
      create: (ref: string, value: Record<string, unknown>) => state.docs.set(ref, value),
      update: (ref: string, value: Record<string, unknown>) => state.docs.set(ref, { ...state.docs.get(ref), ...value }),
      delete: (ref: string) => state.docs.delete(ref),
    }));
    state.queue = run.then(() => undefined, () => undefined); return run;
  },
} }));
import { discardMedia, reserveMedia } from "./media-storage";
const asset = (id: string) => ({ id, pathname: `catalogue/approved/${id}.webp`, ownerId: "system", bytes: 60, scope: "catalogue" as const });
beforeEach(() => { state.docs.clear(); state.del.mockReset().mockResolvedValue(undefined); vi.stubEnv("CATALOGUE_STORAGE_BYTES", "100"); });
afterEach(() => vi.unstubAllEnvs());
describe("transactional storage accounting", () => {
  it("admits only the reservation that fits when imports contend for capacity", async () => {
    const results = await Promise.allSettled([reserveMedia(asset("a")), reserveMedia(asset("b"))]);
    expect(results.map(result => result.status)).toEqual(["fulfilled", "rejected"]);
    expect(state.docs.get("mediaBudgets/catalogue")?.bytes).toBe(60);
  });
  it("reuses a ready content hash without charging storage twice", async () => {
    await reserveMedia(asset("a")); state.docs.get("mediaAssets/a")!.state = "READY";
    await reserveMedia(asset("a")); expect(state.docs.get("mediaBudgets/catalogue")?.bytes).toBe(60);
  });
  it("does not delete a reservation before its upload token expiry grace period", async () => {
    await reserveMedia(asset("a"));
    await discardMedia("a", true);
    expect(state.del).not.toHaveBeenCalled();
    expect(state.docs.get("mediaBudgets/catalogue")?.bytes).toBe(60);
  });
  it("never deletes pinned media or releases capacity on a failed delete", async () => {
    await reserveMedia(asset("a")); state.docs.get("mediaAssets/a")!.published = true;
    await discardMedia("a"); expect(state.del).not.toHaveBeenCalled();
    state.docs.get("mediaAssets/a")!.published = false;
    state.del.mockRejectedValueOnce(new Error("offline"));
    await expect(discardMedia("a")).rejects.toThrow("offline");
    expect(state.docs.get("mediaBudgets/catalogue")?.bytes).toBe(60);
    await discardMedia("a"); expect(state.docs.get("mediaBudgets/catalogue")?.bytes).toBe(0);
    await discardMedia("a"); expect(state.docs.get("mediaBudgets/catalogue")?.bytes).toBe(0);
  });
});
