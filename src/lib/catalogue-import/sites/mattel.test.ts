import { describe,expect,it } from "vitest";
import { parseMattelProducts } from "./mattel";

describe("Mattel sitemap parser",()=>{
  it("extracts official product identity and imagery",()=>{
    const xml=`<urlset><url><loc>https://shop.mattel.com/products/hot-wheels-car-abc12</loc><image:image><image:loc>https://cdn.shopify.com/car.jpg?v=1&amp;x=2</image:loc><image:title>Hot Wheels 1:64 Die-Cast Car</image:title></image:image></url></urlset>`;
    expect(parseMattelProducts(xml)).toEqual([{url:"https://shop.mattel.com/products/hot-wheels-car-abc12",image:"https://cdn.shopify.com/car.jpg?v=1&x=2",title:"Hot Wheels 1:64 Die-Cast Car"}]);
  });
});
