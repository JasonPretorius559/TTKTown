import { describe,expect,it } from "vitest";
import { selectCurrentGcdSeries } from "./grand-comics-database";

describe("Grand Comics Database series selection",()=>{
  it("selects the newest exact English series with indexed issues",()=>{
    const results=[
      {api_url:"old",name:"Batman",country:"us",language:"en",active_issues:["old-1"],issue_descriptors:["1"],year_began:1940,year_ended:2011},
      {api_url:"related",name:"Batman Adventures",country:"us",language:"en",active_issues:["related-1"],issue_descriptors:["1"],year_began:2025,year_ended:null},
      {api_url:"current",name:"Batman",country:"us",language:"en",active_issues:["current-1"],issue_descriptors:["1"],year_began:2016,year_ended:null}
    ];
    expect(selectCurrentGcdSeries(results,"Batman")?.api_url).toBe("current");
  });
});
