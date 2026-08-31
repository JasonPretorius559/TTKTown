import { describe,expect,it } from "vitest";
import { parsePokemonCardTable,parsePokemonExpansionLinks } from "./pokemon-tcg-wiki";

describe("Pokémon TCG Wiki parser",()=>{
  it("discovers expansion pages and release years",()=>{
    const html=`<table><tr><th>Set №</th><th>Set Image</th><th>Set Name</th><th>Set Icon</th><th>Set Release Date</th></tr><tr><td>2</td><td></td><td><a href="/wiki/Phantasmal_Flames">Phantasmal Flames</a></td><td></td><td>November 14, 2025</td></tr></table>`;
    expect(parsePokemonExpansionLinks(html)).toEqual([{name:"Phantasmal Flames",pageTitle:"Phantasmal Flames",sourceUrl:"https://pokemon.fandom.com/wiki/Phantasmal_Flames",releaseYear:2025}]);
  });

  it("extracts numbered cards and preserves their exact card page",()=>{
    const html=`<table><tr><th>№</th><th>Name</th><th>Type</th><th>Rarity</th></tr><tr><td>1/94</td><td><a href="/wiki/Oddish_(Phantasmal_Flames)">Oddish</a></td><td>Grass</td><td>Common</td></tr></table>`;
    expect(parsePokemonCardTable(html,"https://pokemon.fandom.com/wiki/Phantasmal_Flames")).toEqual([{number:"1/94",name:"Oddish",type:"Grass",rarity:"Common",sourceUrl:"https://pokemon.fandom.com/wiki/Oddish_(Phantasmal_Flames)"}]);
  });
});
