import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
vi.mock("server-only", () => ({}));
import { moderateMedia, moderationConfigured, unsafeSightengineResult } from "./media-moderation";

let image: Buffer;
beforeAll(async () => { image = await sharp({ create: { width: 10, height: 10, channels: 3, background: "white" } }).webp().toBuffer(); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
function configure(result: unknown) {
  vi.stubEnv("SIGHTENGINE_API_USER", "user"); vi.stubEnv("SIGHTENGINE_API_SECRET", "secret");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(result)));
}
describe("Sightengine media safety gate", () => {
  it("is configured only when both server credentials exist", () => {
    expect(moderationConfigured()).toBe(false);
    vi.stubEnv("SIGHTENGINE_API_USER", "user"); expect(moderationConfigured()).toBe(false);
    vi.stubEnv("SIGHTENGINE_API_SECRET", "secret"); expect(moderationConfigured()).toBe(true);
  });
  it("approves a decoded safe image and sends credentials in multipart fields", async () => {
    configure({ status: "success", media: { id: "request" }, data: { nudity: { sexual_activity: .01 }, violence: { prob: .01 } } });
    const verdict = await moderateMedia(image, "image/webp");
    expect(verdict).toMatchObject({ decision: "APPROVED", width: 10, height: 10, policyVersion: "sightengine-2026-09" });
    const init = vi.mocked(fetch).mock.calls[0][1]!; const form = init.body as FormData;
    expect(form.get("api_user")).toBe("user"); expect(form.get("api_secret")).toBe("secret"); expect(form.get("models")).toContain("nudity-2.1");
  });
  it("rejects unsafe scores at policy thresholds", () => {
    expect(unsafeSightengineResult({ nudity: { sexual_activity: .25 } })).toBe(true);
    expect(unsafeSightengineResult({ gore: { prob: .45 } })).toBe(true);
    expect(unsafeSightengineResult({ weapon: { prob: .84 }, nudity: { sexual_activity: .24 } })).toBe(false);
  });
  it("fails closed for rejection, malformed responses and provider errors", async () => {
    configure({ status: "success", data: { offensive: { prob: .9 } } });
    await expect(moderateMedia(image, "image/webp")).rejects.toThrow("safety checks");
    configure({ approved: true }); await expect(moderateMedia(image, "image/webp")).rejects.toThrow("unavailable");
    configure({ status: "failure", error: { message: "quota reached" } }); await expect(moderateMedia(image, "image/webp")).rejects.toThrow("quota reached");
  });
});
