import type { Figure } from "@/types";

const STOP_WORDS=new Set(["the","and","with","from","for","ages","age","warning","choking","hazard","made","china","collectible","collection","includes","include"]);
export function figureMatchTokens(value:string){return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").match(/[a-z0-9]+/g)?.filter(token=>token.length>1&&!STOP_WORDS.has(token))||[]}
function normalized(value:string){return figureMatchTokens(value).join(" ")}

export type RankedFigureMatch={figure:Figure;score:number;evidence:string[]};
export function rankFigureMatches(ocrText:string,figures:Figure[],limit=5):RankedFigureMatch[]{
  const scanTokens=new Set(figureMatchTokens(ocrText));const scanText=normalized(ocrText);if(!scanTokens.size)return [];
  return figures.map(figure=>{
    const fields:[string,number][]=[[figure.name,.46],[figure.character,.2],[figure.franchise,.14],[figure.manufacturer,.12],[figure.series,.08]];
    let score=0;const evidence=new Set<string>();
    for(const [value,weight] of fields){const tokens=[...new Set(figureMatchTokens(value))];if(!tokens.length)continue;const hits=tokens.filter(token=>scanTokens.has(token));hits.forEach(token=>evidence.add(token));score+=weight*(hits.length/tokens.length)}
    const name=normalized(figure.name);if(name.length>3&&scanText.includes(name))score+=.28;
    if(evidence.size===1)score*=.72;
    return {figure,score:Math.min(1,score),evidence:[...evidence].slice(0,5)};
  }).filter(item=>item.score>=.08).sort((a,b)=>b.score-a.score||a.figure.name.localeCompare(b.figure.name)).slice(0,limit);
}
