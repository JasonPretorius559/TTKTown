import { afterEach,describe,expect,it,vi } from "vitest";
import { approvedCatalogueSources,catalogueImageHosts,catalogueSourceHosts } from "./source-policy";

describe("catalogue source policy",()=>{
  afterEach(()=>vi.unstubAllEnvs());

  it("allows Pokémon Wiki card artwork without deployment-only configuration",()=>{
    vi.stubEnv("CATALOGUE_APPROVED_SOURCES","");
    vi.stubEnv("CATALOGUE_SOURCE_HOSTS","");
    vi.stubEnv("CATALOGUE_IMAGE_HOSTS","");
    expect(approvedCatalogueSources().has("POKEMON_TCG_WIKI")).toBe(true);
    expect(catalogueSourceHosts().has("pokemon.fandom.com")).toBe(true);
    expect(catalogueImageHosts().has("static.wikia.nocookie.net")).toBe(true);
  });

  it("continues to merge explicitly configured providers and hosts",()=>{
    vi.stubEnv("CATALOGUE_APPROVED_SOURCES","MATTEL");
    vi.stubEnv("CATALOGUE_SOURCE_HOSTS","shop.mattel.com");
    vi.stubEnv("CATALOGUE_IMAGE_HOSTS","cdn.shopify.com");
    expect(approvedCatalogueSources()).toEqual(new Set(["POKEMON_TCG_WIKI","MATTEL"]));
    expect(catalogueSourceHosts()).toEqual(new Set(["pokemon.fandom.com","shop.mattel.com"]));
    expect(catalogueImageHosts()).toEqual(new Set(["static.wikia.nocookie.net","cdn.shopify.com"]));
  });
});
