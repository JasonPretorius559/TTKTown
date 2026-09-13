import "server-only";
import { createHash } from "node:crypto";
import { createFile, type MP4BoxBuffer, type Movie } from "mp4box";
import sharp from "sharp";
import { validVideoMetadata } from "./media-policy";

const MODELS = "nudity-2.1,violence,gore-2.0,offensive-2.0,weapon,self-harm,recreational_drug,text-content-2.0";
const VIDEO_MODELS = `${MODELS},audio-profanity`;
type SightengineResult = { status?: string; error?: { message?: string }; media?: Record<string, unknown>; data?: Record<string, unknown> };

export function moderationConfigured() {
  return Boolean(process.env.SIGHTENGINE_API_USER && process.env.SIGHTENGINE_API_SECRET);
}

function inspectMp4(data: Buffer) {
  return new Promise<{ durationSeconds: number; width: number; height: number; hasAudio: boolean }>((resolve, reject) => {
    const file = createFile();
    let settled = false;
    const finish = (error?: Error, info?: Movie) => {
      if (settled) return;
      settled = true;
      if (error || !info?.hasMoov || info.videoTracks.length !== 1) { reject(error || new Error("Video must contain one valid video track")); return; }
      const video = info.videoTracks[0];
      const result = { durationSeconds: info.duration / info.timescale, width: Math.round(video.video?.width || video.track_width),
        height: Math.round(video.video?.height || video.track_height), hasAudio: info.audioTracks.length > 0 };
      if (!validVideoMetadata({ ...result, contentType: "video/mp4" })) reject(new Error("Video must be at most 60 seconds and 1920 pixels per side"));
      else resolve(result);
    };
    file.onReady = info => finish(undefined, info);
    file.onError = (_module, message) => finish(new Error(message));
    const bytes = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as MP4BoxBuffer;
    bytes.fileStart = 0;
    try { file.appendBuffer(bytes, true); file.flush(); if (!settled) finish(new Error("Could not read MP4 metadata")); }
    catch (error) { finish(error instanceof Error ? error : new Error("Could not read MP4 metadata")); }
  });
}

function numeric(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? value : 0; }
function pathScore(root: unknown, path: string[]) {
  let value = root;
  for (const part of path) value = value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined;
  return numeric(value);
}
export function unsafeSightengineResult(data: Record<string, unknown>) {
  const checks: Array<[string[], number]> = [
    [["nudity","sexual_activity"],.25], [["nudity","sexual_display"],.25], [["nudity","erotica"],.45], [["nudity","sextoy"],.4], [["nudity","suggestive"],.75],
    [["violence","prob"],.5], [["gore","prob"],.45], [["offensive","prob"],.5], [["weapon","prob"],.85],
    [["self-harm","prob"],.4], [["recreational_drug","prob"],.65], [["text-content","unsafe"],.5], [["text_content","unsafe"],.5],
  ];
  return checks.some(([path, limit]) => pathScore(data, path) >= limit);
}
function videoFrames(result: SightengineResult) {
  const frames = result.data?.frames;
  return Array.isArray(frames) ? frames.filter((frame): frame is Record<string, unknown> => Boolean(frame && typeof frame === "object")) : [];
}

export async function moderateMedia(data: Buffer, contentType: string) {
  if (!moderationConfigured()) throw new Error("Automated media checks are not configured. Publishing is paused.");
  const isVideo = contentType === "video/mp4";
  if (!isVideo && contentType !== "image/webp") throw new Error("Unsupported media type");
  const metadata = isVideo ? await inspectMp4(data) : await sharp(data, { limitInputPixels: 25_000_000 }).metadata().then(info => ({
    durationSeconds: undefined, width: info.width || 0, height: info.height || 0, hasAudio: false,
  }));
  if (!metadata.width || !metadata.height) throw new Error("Media could not be decoded");
  const form = new FormData();
  form.append("media", new Blob([Uint8Array.from(data)], { type: contentType }), isVideo ? "upload.mp4" : "upload.webp");
  form.append("models", isVideo ? VIDEO_MODELS : MODELS);
  form.append("api_user", process.env.SIGHTENGINE_API_USER!);
  form.append("api_secret", process.env.SIGHTENGINE_API_SECRET!);
  const response = await fetch(isVideo ? "https://api.sightengine.com/1.0/video/check-sync.json" : "https://api.sightengine.com/1.0/check.json", {
    method: "POST", body: form, redirect: "error", signal: AbortSignal.timeout(isVideo ? 65_000 : 30_000), cache: "no-store",
  });
  const result = await response.json().catch(() => null) as SightengineResult | null;
  if (!response.ok || result?.status !== "success" || !result.data) throw new Error(result?.error?.message || "Sightengine checks are unavailable. Try again later.");
  const frames = isVideo ? videoFrames(result) : [result.data];
  if (!frames.length || frames.some(unsafeSightengineResult)) throw new Error("This media did not pass the community safety checks.");
  const audio = result.data.audio as { profanity?: unknown } | undefined;
  if (isVideo && metadata.hasAudio && (!audio || !Array.isArray(audio.profanity))) throw new Error("Sightengine did not complete the audio safety check.");
  if (Array.isArray(audio?.profanity) && audio.profanity.length) throw new Error("This media did not pass the community safety checks.");
  return { decision: "APPROVED" as const, sha256: createHash("sha256").update(data).digest("hex"), policyVersion: "sightengine-2026-09",
    decoded: true as const, contentType, durationSeconds: metadata.durationSeconds, width: metadata.width, height: metadata.height,
    fullVideoReviewed: isVideo || undefined, audioReviewed: isVideo || undefined, requestId: String(result.media?.id || "") };
}
