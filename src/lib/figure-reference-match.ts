import type { RankedFigureMatch } from "@/lib/figure-match";
import type { Figure } from "@/types";

export type ImageSignature={pixels:Float32Array;edges:Uint8Array};

const signatureCache=new Map<string,Promise<ImageSignature>>();

export function signatureFromPixels(data:Uint8ClampedArray,width:number,height:number):ImageSignature{
  const pixels=new Float32Array(width*height*4);
  for(let index=0;index<width*height;index++){
    const alpha=data[index*4+3]/255;
    pixels[index*4]=(data[index*4]/255)*alpha;
    pixels[index*4+1]=(data[index*4+1]/255)*alpha;
    pixels[index*4+2]=(data[index*4+2]/255)*alpha;
    pixels[index*4+3]=alpha;
  }
  const edges=new Uint8Array(64);
  for(let y=0;y<8;y++)for(let x=0;x<8;x++){
    const row=Math.min(height-1,Math.floor((y+.5)*height/8));
    const left=Math.min(width-1,Math.floor((x+.5)*width/9));
    const right=Math.min(width-1,Math.floor((x+1.5)*width/9));
    const luminance=(column:number)=>{const offset=(row*width+column)*4;return .2126*pixels[offset]+.7152*pixels[offset+1]+.0722*pixels[offset+2]};
    edges[y*8+x]=luminance(left)>luminance(right)?1:0;
  }
  return {pixels,edges};
}

export function referenceImageSimilarity(left:ImageSignature,right:ImageSignature){
  if(left.pixels.length!==right.pixels.length||left.edges.length!==right.edges.length)return 0;
  let pixelDifference=0;for(let index=0;index<left.pixels.length;index++)pixelDifference+=Math.abs(left.pixels[index]-right.pixels[index]);
  let matchingEdges=0;for(let index=0;index<left.edges.length;index++)if(left.edges[index]===right.edges[index])matchingEdges++;
  const pixelScore=1-pixelDifference/left.pixels.length;const edgeScore=matchingEdges/left.edges.length;
  return Math.max(0,Math.min(1,.68*pixelScore+.32*edgeScore));
}

async function signatureForUrl(url:string){
  const existing=signatureCache.get(url);if(existing)return existing;
  const pending=new Promise<ImageSignature>((resolve,reject)=>{
    const image=new window.Image();image.decoding="async";
    try{if(new URL(url,window.location.href).origin!==window.location.origin)image.crossOrigin="anonymous"}catch{}
    image.onload=()=>{try{const canvas=document.createElement("canvas");canvas.width=32;canvas.height=32;const context=canvas.getContext("2d",{willReadFrequently:true});if(!context)throw new Error("Canvas unavailable");context.clearRect(0,0,32,32);context.drawImage(image,0,0,32,32);resolve(signatureFromPixels(context.getImageData(0,0,32,32).data,32,32))}catch(reason){reject(reason)}};
    image.onerror=()=>reject(new Error("Reference image unavailable"));image.src=url;
  });
  signatureCache.set(url,pending);pending.catch(()=>signatureCache.delete(url));return pending;
}

export async function rankFiguresByReferenceImage(imageUrl:string,figures:Figure[],onProgress:(progress:number)=>void=()=>{}):Promise<RankedFigureMatch[]>{
  const query=await signatureForUrl(imageUrl);const results:RankedFigureMatch[]=[];let completed=0;
  for(let offset=0;offset<figures.length;offset+=6){
    const batch=await Promise.all(figures.slice(offset,offset+6).map(async figure=>{const url=figure.image||figure.images?.[0];if(!url)return null;try{return {figure,score:referenceImageSimilarity(query,await signatureForUrl(url)),evidence:["matching catalogue image"]} satisfies RankedFigureMatch}catch{return null}}));
    results.push(...batch.filter((item):item is RankedFigureMatch=>Boolean(item)));completed+=batch.length;onProgress(Math.round(5+20*completed/Math.max(1,figures.length)));
  }
  return results.filter(item=>item.score>=.82).sort((a,b)=>b.score-a.score).slice(0,5);
}
