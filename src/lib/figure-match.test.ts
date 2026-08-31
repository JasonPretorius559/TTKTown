import { describe,expect,it } from "vitest";
import { rankFigureMatches } from "./figure-match";
import type { Figure } from "@/types";

const figure=(id:string,name:string,character:string,franchise:string,manufacturer:string,series="")=>({id,slug:id,name,character,franchise,manufacturer,series,scale:"1:6",releaseYear:2025,description:"",image:""} as Figure);
describe("OCR figure matching",()=>{
  const figures=[figure("batman","Batman Tactical Batsuit","Batman","DC","Hot Toys","Movie Masterpiece"),figure("spider","Spider-Man Advanced Suit 2.0","Spider-Man","Marvel","Hot Toys","Video Game Masterpiece"),figure("heman","He-Man Origins","He-Man","Masters of the Universe","Mattel","Origins")];
  it("ranks a packaging text match above unrelated catalogue records",()=>{expect(rankFigureMatches("HOT TOYS MARVEL SPIDER-MAN ADVANCED SUIT 2.0 VIDEO GAME MASTERPIECE",figures)[0].figure.id).toBe("spider")});
  it("can rank from useful capture filename clues when the image has no text",()=>{expect(rankFigureMatches("batman hot toys pop",figures)[0].figure.id).toBe("batman")});
  it("returns no suggestion when OCR has no useful overlap",()=>{expect(rankFigureMatches("CE CONFORMS TO SAFETY STANDARD",figures)).toEqual([])});
});
