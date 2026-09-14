import {describe,expect,it} from "vitest";
import {buildMarketValueQuery,estimateActiveMarketValue,type MarketComparable} from "./market-value";

const comparable=(id:string,price:number,currency="USD"):MarketComparable=>({id,title:`Listing ${id}`,url:`https://www.ebay.com/itm/${id}`,image:"",price,currency});

describe("eBay market-value estimates",()=>{
  it("builds a compact identity query without repeated or generic fields",()=>{
    expect(buildMarketValueQuery({name:"Oddish 1/94",manufacturer:"The Pokémon Company",series:"Phantasmal Flames",scale:"Trading Card"}))
      .toBe("Oddish 1/94 The Pokémon Company Phantasmal Flames");
  });

  it("uses the median and interquartile range of same-currency active listings",()=>{
    const result=estimateActiveMarketValue({figureId:"oddish",query:"Oddish 1/94",marketplace:"EBAY_US",environment:"production",asOf:"2026-09-14T00:00:00.000Z",
      comparables:[comparable("a",10),comparable("b",20),comparable("c",30),comparable("d",1000),comparable("zar",500,"ZAR")]});
    expect(result).toMatchObject({status:"READY",currency:"USD",estimate:25,rangeLow:17.5,rangeHigh:272.5,lowest:10,highest:1000,sampleSize:4});
  });

  it("does not state a value when fewer than three comparables exist",()=>{
    expect(estimateActiveMarketValue({figureId:"x",query:"x",marketplace:"EBAY_US",environment:"sandbox",comparables:[comparable("a",10)]})).toMatchObject({status:"INSUFFICIENT_DATA",estimate:null,sampleSize:1});
  });
});
