import { describe,expect,it } from "vitest";
import { funkoPageMetadata, funkoVariationImage, parseFunkoFigures } from "./funko";

const sitemap=(urls:string[])=>`<urlset>${urls.map(url=>`<url><loc>${url}</loc><lastmod>2026-08-30</lastmod></url>`).join("")}</urlset>`;

describe("parseFunkoFigures",()=>{
  it("imports collectible figures across franchises and excludes merchandise",()=>{
    const result=parseFunkoFigures(sitemap([
      "https://funko.com/pop-spider-man-marvel-new-classics/82500.html",
      "https://funko.com/pop-ninth-doctor-doctor-who/93137.html",
      "https://funko.com/bitty-pop-pikachu-pokemon/12345.html",
      "https://funko.com/pokemon-pikachu-backpack/99999.html",
    ]),"run");

    expect(result.discovered).toBe(4);
    expect(result.eligible).toBe(3);
    expect(result.candidates).toHaveLength(3);
    expect(result.candidates.map(item=>item.franchise)).toEqual(["Marvel","Doctor Who","Pokémon"]);
  });

  it("only applies a cap when one is explicitly supplied",()=>{
    const xml=sitemap([
      "https://funko.com/pop-a/1.html",
      "https://funko.com/pop-b/2.html",
      "https://funko.com/pop-c/3.html",
    ]);

    expect(parseFunkoFigures(xml,"run").candidates).toHaveLength(3);
    expect(parseFunkoFigures(xml,"run",2).candidates).toHaveLength(2);
  });

  it("extracts official product imagery and descriptions",()=>{
    const html=`<meta property="og:image" content="https://funko.com/image.png"><meta content="Official product description" property="og:description">`;
    expect(funkoPageMetadata(html)).toEqual({image:"https://funko.com/image.png",description:"Official product description"});
  });

  it("extracts the full-size image from Funko's variation response",()=>{
    const html=`<img src="https://funko.com/dw/image/v2/BGTS_PRD/example.png?sw=800&amp;sh=800">`;
    expect(funkoVariationImage(html)).toBe("https://funko.com/dw/image/v2/BGTS_PRD/example.png?sw=800&sh=800");
  });
});
