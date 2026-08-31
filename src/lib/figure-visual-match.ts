import type { Figure } from "@/types";
import type { RankedFigureMatch } from "@/lib/figure-match";
import { rankFiguresByReferenceImage } from "@/lib/figure-reference-match";

type VisionOutput={label:string;score:number};
type VisionClassifier=(image:string,labels:string[],options?:{hypothesis_template?:string})=>Promise<VisionOutput[]|VisionOutput[][]>;
let classifierPromise:Promise<VisionClassifier>|null=null;

const MEDIA_LABELS=["a Funko Pop vinyl figure","an articulated action figure","a comic book cover","a trading card","a die-cast toy car","a fashion doll"];
function normalized(value:string){return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim()}
function singleOutput(value:VisionOutput[]|VisionOutput[][]){return Array.isArray(value[0])?value[0] as VisionOutput[]:value as VisionOutput[]}
function matchesMedia(figure:Figure,media:string){
  const value=normalized([figure.name,figure.manufacturer,figure.franchise,figure.series,figure.scale].join(" "));
  if(media.includes("comic book"))return /comic book/.test(value);
  if(media.includes("trading card"))return /trading card|pokemon.*card/.test(value);
  if(media.includes("die-cast"))return /hot wheels|matchbox|die cast|1 64/.test(value);
  if(media.includes("fashion doll"))return /barbie|monster high|fashion doll/.test(value);
  if(media.includes("Funko"))return /funko|pop vinyl/.test(value);
  return !/comic book|trading card|hot wheels|matchbox/.test(value);
}
async function classifier(onProgress:(progress:number)=>void){
  if(!classifierPromise)classifierPromise=(async()=>{const transformers=await import("@huggingface/transformers");transformers.env.allowLocalModels=false;const pipe=await transformers.pipeline("zero-shot-image-classification","Xenova/mobileclip_s0",{dtype:"q8",progress_callback:(event:unknown)=>{const progress=Number((event as {progress?:number}).progress);if(Number.isFinite(progress))onProgress(Math.round(progress))}});return pipe as unknown as VisionClassifier})();
  return classifierPromise;
}

export async function rankFiguresVisually(imageUrl:string,figures:Figure[],onProgress:(progress:number)=>void=()=>{}):Promise<RankedFigureMatch[]>{
  const referenceMatches=await rankFiguresByReferenceImage(imageUrl,figures,onProgress);
  if((referenceMatches[0]?.score||0)>=.9)return referenceMatches;
  const identify=await classifier(onProgress);const characterCounts=new Map<string,{label:string;count:number}>();
  for(const figure of figures){const label=(figure.character||figure.franchise||"").trim();const key=normalized(label);if(key.length<2||key.length>55)continue;const current=characterCounts.get(key);characterCounts.set(key,{label:current?.label||label,count:(current?.count||0)+1})}
  const characters=[...characterCounts.values()].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label)).slice(0,90);
  const characterLabels=characters.map(item=>`a collectible of ${item.label}`);const broadLabels=[...MEDIA_LABELS,...characterLabels];if(!characterLabels.length)return [];
  const broad=singleOutput(await identify(imageUrl,broadLabels,{hypothesis_template:"This image shows {}"}));const media=broad.filter(item=>MEDIA_LABELS.includes(item.label)).sort((a,b)=>b.score-a.score)[0]?.label||"an articulated action figure";
  const likelyCharacters=broad.filter(item=>item.label.startsWith("a collectible of ")).sort((a,b)=>b.score-a.score).slice(0,8).map(item=>item.label.replace("a collectible of ",""));
  let shortlist=figures.filter(figure=>likelyCharacters.some(character=>{const target=normalized(character);return [figure.character,figure.name,figure.franchise].some(value=>{const field=normalized(value);return Boolean(field)&&(field.includes(target)||target.includes(field))})}));
  const mediaShortlist=shortlist.filter(figure=>matchesMedia(figure,media));if(mediaShortlist.length)shortlist=mediaShortlist;else if(media.includes("Funko"))shortlist=shortlist.filter(figure=>matchesMedia(figure,"an articulated action figure"));
  shortlist=shortlist.slice(0,72);if(!shortlist.length)return [];
  const labelMap=new Map<string,Figure>();const labels=shortlist.map(figure=>{let label=`${figure.manufacturer} ${figure.name} ${figure.series}`.replace(/\s+/g," ").trim();let suffix=2;while(labelMap.has(label))label=`${figure.manufacturer} ${figure.name} ${figure.series} version ${suffix++}`.replace(/\s+/g," ").trim();labelMap.set(label,figure);return label});
  const specific=singleOutput(await identify(imageUrl,labels,{hypothesis_template:"This is a product photo of {}"})).sort((a,b)=>b.score-a.score).slice(0,5);const best=specific[0]?.score||1;
  const semantic=specific.map(item=>({figure:labelMap.get(item.label)!,score:Math.min(.94,.45+.45*(item.score/best)),evidence:[`visual: ${likelyCharacters[0]||"collectible"}`,media.replace(/^a |^an /,"")]})).filter(item=>Boolean(item.figure));
  const combined=new Map<string,RankedFigureMatch>();for(const item of [...referenceMatches,...semantic]){const current=combined.get(item.figure.id);combined.set(item.figure.id,current?{...item,score:Math.max(current.score,item.score),evidence:[...new Set([...current.evidence,...item.evidence])]}:item)}
  return [...combined.values()].sort((a,b)=>b.score-a.score).slice(0,5);
}
