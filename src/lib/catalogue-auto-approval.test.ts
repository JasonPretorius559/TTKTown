import { describe, expect, it } from "vitest";
import { planAutomaticApprovals } from "./catalogue-auto-approval";
import type { CatalogueCandidate, Figure } from "../types";

const candidate=(overrides:Partial<CatalogueCandidate>={}):CatalogueCandidate=>({
  id:"funko_1234567890abcdef12345678",source:"FUNKO",sourceId:"123",sourceUrl:"https://funko.com/product",sourceQuery:"Official source",fingerprint:"fingerprint",
  name:"Spider-Man Pop!",franchise:"Marvel",character:"Spider-Man",manufacturer:"Funko",series:"Marvel",scale:"",releaseYear:null,
  description:"Official Spider-Man collectible.",imageStatus:"APPROVED",imageAssetId:"catalogue_abc",referenceImagePathname:"catalogue/approved/abc.webp",referenceImageUrl:"/api/blob?pathname=catalogue%2Fapproved%2Fabc.webp",status:"PENDING",importRunId:"run",...overrides
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

  it("holds Funko records instead of publishing placeholders",()=>{
    const result=planAutomaticApprovals([candidate({referenceImageUrl:""})],[]);
    expect(result.ready).toHaveLength(0);expect(result.held).toHaveLength(1);
  });

  it("does not trust an external URL or a missing moderation verdict",()=>{
    expect(planAutomaticApprovals([candidate({referenceImageUrl:"https://funko.com/image.jpg"})],[]).held).toHaveLength(1);
    expect(planAutomaticApprovals([candidate({imageStatus:undefined})],[]).held).toHaveLength(1);
  });

  it("keeps different scales and release years as separate identities",()=>{
    const variants=[candidate({id:"small",scale:"1:12",releaseYear:2024}),candidate({id:"large",scale:"1:6",releaseYear:2024}),candidate({id:"reissue",scale:"1:12",releaseYear:2025})];
    expect(planAutomaticApprovals(variants,[]).ready).toHaveLength(3);
  });

  it("links exact duplicates instead of creating another figure",()=>{
    const existing={id:"figure_1",name:"Spider-Man Pop!",manufacturer:"Funko",series:"Marvel"} as Figure;
    const result=planAutomaticApprovals([candidate()], [existing]);
    expect(result.ready).toHaveLength(0);expect(result.duplicates).toEqual([{candidate:candidate(),figureId:"figure_1"}]);
  });
});
