export const IMAGE_DOWNLOAD_LIMIT = 5 * 1024 * 1024;
export const IMAGE_STORAGE_LIMIT = 200 * 1024;
export const VIDEO_STORAGE_LIMIT = 20 * 1024 * 1024;
export const VIDEO_DURATION_LIMIT = 60;
export const VIDEO_TYPES = ["video/mp4"];

export function positiveLimit(value: string | undefined, fallback: number) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : fallback;
}

export function cleanImportedText(value: string, maximum = 1000) {
  return value.replace(/<[^>]*>/g, " ").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maximum);
}

export async function readBoundedStream(stream: ReadableStream<Uint8Array>, maximum: number) {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) throw new Error("Media exceeds the download limit");
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally { reader.releaseLock(); }
  if (!size) throw new Error("Empty media file");
  return Buffer.concat(chunks, size);
}

export function validVideoMetadata(value: {durationSeconds?: number; width?: number; height?: number; contentType?: string}) {
  return Number.isFinite(value.durationSeconds) && value.durationSeconds! > 0 && value.durationSeconds! <= VIDEO_DURATION_LIMIT
    && Number.isInteger(value.width) && value.width! > 0 && value.width! <= 1920
    && Number.isInteger(value.height) && value.height! > 0 && value.height! <= 1920
    && VIDEO_TYPES.includes(value.contentType || "");
}
