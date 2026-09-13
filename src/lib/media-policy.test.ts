import { describe, expect, it, vi } from "vitest";
import { cleanImportedText, positiveLimit, readBoundedStream, validVideoMetadata } from "./media-policy";

describe("media boundaries", () => {
  it("cancels a streamed download as soon as actual bytes exceed the limit", async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(4)); controller.enqueue(new Uint8Array(5)); }, cancel });
    await expect(readBoundedStream(stream, 8)).rejects.toThrow("download limit");
    expect(cancel).toHaveBeenCalledOnce();
  });
  it("accepts bounded content and rejects empty streams", async () => {
    const stream = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new Uint8Array([1,2])); c.close(); } });
    expect(await readBoundedStream(stream, 2)).toEqual(Buffer.from([1,2]));
    await expect(readBoundedStream(new ReadableStream({ start(c) { c.close(); } }), 2)).rejects.toThrow("Empty");
  });
  it("does not accept unknown duration, oversized dimensions or non-video media", () => {
    const valid = { durationSeconds: 60, width: 1080, height: 1920, contentType: "video/mp4" };
    expect(validVideoMetadata(valid)).toBe(true);
    for (const changes of [{ durationSeconds: Infinity }, { durationSeconds: 0 }, { durationSeconds: 60.1 }, { height: 1921 }, { contentType: "video/webm" }, { contentType: "text/html" }]) expect(validVideoMetadata({ ...valid, ...changes })).toBe(false);
  });
  it("bounds text and prevents malformed budgets from disabling caps", () => {
    expect(cleanImportedText('<img src=x> Toy\u0000 <b>car</b>', 7)).toBe("Toy car");
    for (const value of ["", "NaN", "Infinity", "-1", "0", "0.5"]) expect(positiveLimit(value, 100)).toBe(100);
  });
});
