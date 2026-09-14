import "server-only";
import { getEbayApplicationToken } from "./catalogue-import/ebay";
import { buildMarketValueQuery,estimateActiveMarketValue,type MarketComparable,type MarketValueEstimate } from "./market-value";
import type { Figure } from "@/types";

type EbayValueItem={itemId?:string;title?:string;itemWebUrl?:string;image?:{imageUrl?:string};price?:{value?:string;currency?:string}};
type EbayValueResponse={itemSummaries?:EbayValueItem[]};

export async function fetchEbayMarketValue(figure:Figure):Promise<MarketValueEstimate>{
  const environment=process.env.EBAY_ENVIRONMENT?.toLowerCase()==="sandbox"?"sandbox":"production";
  const origin=environment==="sandbox"?"https://api.sandbox.ebay.com":"https://api.ebay.com";
  const marketplace=process.env.EBAY_MARKETPLACE_ID||"EBAY_US";const query=buildMarketValueQuery(figure);
  if(!query)return estimateActiveMarketValue({figureId:figure.id,query,marketplace,environment,comparables:[]});
  const token=await getEbayApplicationToken();const params=new URLSearchParams({q:query,limit:"50",filter:"buyingOptions:{FIXED_PRICE}"});
  const response=await fetch(`${origin}/buy/browse/v1/item_summary/search?${params}`,{headers:{Authorization:`Bearer ${token}`,"X-EBAY-C-MARKETPLACE-ID":marketplace},cache:"no-store",signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error(`eBay market search failed (${response.status})`);
  const payload=await response.json() as EbayValueResponse;const comparables:MarketComparable[]=[];const seen=new Set<string>();
  for(const item of payload.itemSummaries||[]){const price=Number(item.price?.value);const currency=item.price?.currency?.toUpperCase()||"";if(!item.itemId||!item.title||!item.itemWebUrl||seen.has(item.itemId)||!Number.isFinite(price)||price<=0)continue;seen.add(item.itemId);comparables.push({id:item.itemId,title:item.title,url:item.itemWebUrl,image:item.image?.imageUrl||"",price,currency})}
  return estimateActiveMarketValue({figureId:figure.id,query,marketplace,environment,comparables});
}
