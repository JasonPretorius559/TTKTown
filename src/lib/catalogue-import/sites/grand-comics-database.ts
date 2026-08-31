import { createHash } from "crypto";
import type { CatalogueCandidate } from "@/types";

const API_ORIGIN="https://www.comics.org";
const LANES=[
  {seriesId:"103016",franchise:"Batman",publisher:"DC Comics"},
  {seriesId:"196803",franchise:"Superman",publisher:"DC Comics"},
  {seriesId:"184161",franchise:"Spider-Man",publisher:"Marvel Comics"},
  {seriesId:"71939",franchise:"X-Men",publisher:"Marvel Comics"},
  {seriesId:"200634",franchise:"Avengers",publisher:"Marvel Comics"},
  {seriesId:"4611",franchise:"Spawn",publisher:"Image Comics"}
] as const;

type GcdSeries={api_url:string;name:string;country:string;language:string;active_issues:string[];issue_descriptors:string[];year_began:number|null;year_ended:number|null};
function normalized(value:string){return value.trim().toLocaleLowerCase("en").replace(/\s+/g," ")}
export function selectCurrentGcdSeries(results:GcdSeries[],query:string){
  return results.filter(item=>normalized(item.name)===normalized(query)&&item.language==="en"&&item.active_issues?.length).sort((a,b)=>(b.year_began||0)-(a.year_began||0))[0]||null;
}
function issueId(apiUrl:string){return apiUrl.match(/\/issue\/(\d+)\/?$/)?.[1]||createHash("sha256").update(apiUrl).digest("hex").slice(0,16)}
function publicIssueUrl(apiUrl:string){return apiUrl.replace(/\/api\/issue\//,"/issue/")}

export async function discoverGrandComicsDatabaseCollectibles(importRunId:string,limit=300){
  const searches=await Promise.all(LANES.map(async lane=>{
    const response=await fetch(`${API_ORIGIN}/api/series/${lane.seriesId}/`,{headers:{"User-Agent":"TinkerTownCatalogueBot/1.0 (catalogue metadata import)",Accept:"application/json"},cache:"no-store"});
    if(!response.ok)return {lane,series:null};
    return {lane,series:await response.json() as GcdSeries};
  }));
  const records:{lane:typeof LANES[number];series:GcdSeries;apiUrl:string;descriptor:string}[]=[];
  const issueLanes=searches.filter((item):item is typeof item&{series:GcdSeries}=>Boolean(item.series)).map(item=>({item,issues:item.series.active_issues.map((apiUrl,index)=>({apiUrl,descriptor:item.series.issue_descriptors[index]||String(index+1)})).reverse()}));
  for(let issueIndex=0;records.length<limit&&issueLanes.some(lane=>lane.issues[issueIndex]);issueIndex++){
    for(const lane of issueLanes){const issue=lane.issues[issueIndex];if(!issue)continue;records.push({lane:lane.item.lane,series:lane.item.series,apiUrl:issue.apiUrl,descriptor:issue.descriptor});if(records.length>=limit)break}
  }
  if(!records.length)throw new Error("Grand Comics Database did not return any collector issues");
  const candidates=records.map<CatalogueCandidate>(record=>{
    const idValue=issueId(record.apiUrl);const fingerprint=createHash("sha256").update(`gcd|${idValue}`).digest("hex");const descriptor=record.descriptor.trim()||"Issue";const name=`${record.series.name} #${descriptor}`;
    return {id:`gcd_${fingerprint.slice(0,24)}`,source:"GCD",sourceId:idValue,sourceUrl:publicIssueUrl(record.apiUrl),sourceQuery:`Grand Comics Database API · ${record.series.name}`,sourceLicense:"CC BY-SA 4.0 · Grand Comics Database metadata",fingerprint,name,franchise:record.lane.franchise,character:record.lane.franchise,manufacturer:record.lane.publisher,series:record.series.name,scale:"Comic Book",releaseYear:null,description:`${name}, catalogued by the Grand Comics Database. Community-maintained issue metadata attributed under CC BY-SA 4.0.`,referenceImageUrl:"",status:"PENDING",importRunId};
  });
  return {discovered:records.length,candidates,pages:[`${API_ORIGIN}/`,...searches.filter(item=>item.series).map(item=>`${API_ORIGIN}/api/series/${item.lane.seriesId}/`)]};
}
