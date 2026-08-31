import { describe,expect,it } from "vitest";
import { referenceImageSimilarity,signatureFromPixels } from "./figure-reference-match";

function pixels(seed:number){const data=new Uint8ClampedArray(16*16*4);for(let index=0;index<16*16;index++){data[index*4]=(index*seed)%255;data[index*4+1]=(index*3+seed)%255;data[index*4+2]=(index*7+seed)%255;data[index*4+3]=255}return data}

describe("reference image similarity",()=>{
  it("recognizes the same catalogue image",()=>{const signature=signatureFromPixels(pixels(5),16,16);expect(referenceImageSimilarity(signature,signature)).toBe(1)});
  it("ranks a different image below an identical reference",()=>{const original=signatureFromPixels(pixels(5),16,16);const different=signatureFromPixels(pixels(19),16,16);expect(referenceImageSimilarity(original,different)).toBeLessThan(.9)});
});
