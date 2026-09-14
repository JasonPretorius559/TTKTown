import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));
vi.mock("node:https", () => ({ request: vi.fn() }));
import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { downloadSourceImage,sourceImageHeaders } from "./safe-image-download";
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe("source image request restrictions", () => {
  it("identifies the importer and sends Fandom's required image referrer",()=>{
    expect(sourceImageHeaders(new URL("https://static.wikia.nocookie.net/pokemon/card.png"))).toMatchObject({
      Host:"static.wikia.nocookie.net",Referer:"https://pokemon.fandom.com/"
    });
  });
  it("rejects unknown hosts, non-HTTPS and credential-bearing URLs before connecting", async () => {
    vi.stubEnv("CATALOGUE_IMAGE_HOSTS", "images.example");
    for (const url of ["https://other.example/a.jpg", "http://images.example/a.jpg", "https://user:pass@images.example/a.jpg", "https://images.example:444/a.jpg"]) await expect(downloadSourceImage(url)).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });
  it("blocks private, loopback, metadata, multicast and mixed public/private DNS results", async () => {
    vi.stubEnv("CATALOGUE_IMAGE_HOSTS", "images.example");
    for (const addresses of [["127.0.0.1"],["169.254.169.254"],["10.1.1.1"],["100.64.1.1"],["224.0.0.1"],["8.8.8.8","192.168.1.1"]]) {
      vi.mocked(lookup).mockResolvedValue(addresses.map(address=>({address,family:4})) as never);
      await expect(downloadSourceImage("https://images.example/a.jpg")).rejects.toThrow("restricted");
    }
    expect(request).not.toHaveBeenCalled();
  });
});
