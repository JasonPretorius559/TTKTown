import { describe, expect, it } from "vitest";
import { assertAppropriateContent, containsOffensiveContent } from "./content-filter";

describe("offensive content filter",()=>{
  it("allows ordinary collector conversation",()=>{
    expect(containsOffensiveContent("Amazing Spider-Man figure with a damaged box")).toBe(false);
    expect(()=>assertAppropriateContent(["Selling my collection in Cape Town"])).not.toThrow();
  });

  it("blocks offensive words without matching innocent longer words",()=>{
    expect(containsOffensiveContent("This is bullshit")).toBe(true);
    expect(containsOffensiveContent("Classic Scunthorpe collector meetup")).toBe(false);
  });

  it("blocks spaced, punctuated, repeated and leetspeak variants",()=>{
    expect(containsOffensiveContent("f.u.c.k")).toBe(true);
    expect(containsOffensiveContent("sh111t")).toBe(true);
    expect(containsOffensiveContent("fuuuck")).toBe(true);
  });

  it("blocks direct abusive instructions",()=>{
    expect(containsOffensiveContent("go die")).toBe(true);
    expect(()=>assertAppropriateContent(["kys"])).toThrow("offensive or abusive language");
  });
});
