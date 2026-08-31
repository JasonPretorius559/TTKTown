import { describe, expect, it } from "vitest";
import { planAutomaticApprovals } from "./catalogue-auto-approval";
import type { CatalogueCandidate, Figure } from "../types";

const candidate=(overrides:Partial<CatalogueCandidate>={}):CatalogueCandidate=>({
  id:"funko_1234567890abcdef12345678",source:"FUNKO",sourceId:"123",sourceUrl:"https://funko.com/product",sourceQuery:"Official source",fingerprint:"fingerprint",
  name:"Spider-Man Pop!",franchise:"Marvel",character:"Spider-Man",manufacturer:"Funko",series:"Marvel",scale:"",releaseYear:null,
  description:"Official Spider-Man collectible.",referenceImageUrl:"https://funko.com/image.jpg",status:"PENDING",importRunId:"run",...overrides
});

describe("planAutomaticApprovals",()=>{
  it("approves a complete sourced candidate",()=>{
    const result=planAutomaticApprovals([candidate()],[]);
    expect(result.ready).toHaveLength(1);expect(result.held).toHaveLength(0);expect(result.ready[0].slug).toMatch(/^spider-man-pop-/);
  });

  it("holds candidates without a usable image",()=>{
    const result=planAutomaticApprovals([candidate({source:"WEB",referenceImageUrl:""})],[]);
    expect(result.ready).toHaveLength(0);expect(result.held).toHaveLength(1);
  });

  it("uses a catalogue placeholder for Funko sitemap records",()=>{
    const result=planAutomaticApprovals([candidate({referenceImageUrl:""})],[]);
    expect(result.ready[0].imageUrl).toBe("/catalogue-funko-placeholder.svg");
  });

  it("links exact duplicates instead of creating another figure",()=>{
    const existing={id:"figure_1",name:"Spider-Man Pop!",manufacturer:"Funko",series:"Marvel"} as Figure;
    const result=planAutomaticApprovals([candidate()], [existing]);
    expect(result.ready).toHaveLength(0);expect(result.duplicates).toEqual([{candidate:candidate(),figureId:"figure_1"}]);
  });
});
