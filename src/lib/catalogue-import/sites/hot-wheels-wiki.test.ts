import { describe,expect,it } from "vitest";
import { parseHotWheelsWikiTable } from "./hot-wheels-wiki";

describe("Hot Wheels Wiki table parser",()=>{
  it("extracts model variants, attribution links, and original imagery",()=>{
    const html=`<table class="wikitable"><tr><th>Toy #</th><th>Col.#</th><th>Model Name</th><th>Series</th><th>Series #</th><th>Photo</th></tr><tr><td>JJL03</td><td>001</td><td><a href="/wiki/Mazda_MX-5_Miata_(2025)">Mazda MX-5 Miata</a> (2nd Color)</td><td><a href="/wiki/HW_Dream_Garage">HW Dream Garage</a></td><td>1/5</td><td><a href="https://static.wikia.nocookie.net/hotwheels/images/4/41/1990Mazda.jpg/revision/latest?cb=1"><img /></a></td></tr></table>`;
    expect(parseHotWheelsWikiTable(html)).toEqual([{toyNumber:"JJL03",collectionNumber:"001",name:"Mazda MX-5 Miata (2nd Color)",series:"HW Dream Garage",seriesNumber:"1/5",sourceUrl:"https://hotwheels.fandom.com/wiki/Mazda_MX-5_Miata_(2025)",imageUrl:"https://static.wikia.nocookie.net/hotwheels/images/4/41/1990Mazda.jpg/revision/latest?cb=1"}]);
  });

  it("drops the wiki's image-not-available asset so the catalogue placeholder is used",()=>{
    const html=`<table><tr><th>Toy #</th><th>Col.#</th><th>Model Name</th><th>Series</th><th>Series #</th><th>Photo</th></tr><tr><td>JJM49</td><td>002</td><td>Roadster</td><td>Exoticars</td><td>1/10</td><td><a href="https://static.wikia.nocookie.net/hotwheels/images/b/b5/Image_Not_Available.jpg/revision/latest"><img /></a></td></tr></table>`;
    expect(parseHotWheelsWikiTable(html)[0].imageUrl).toBe("");
  });
});
