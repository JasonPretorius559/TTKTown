"use client";
import { use } from "react";
import { CollectionDetail } from "@/components/collection-builder";
export default function CollectionDetailPage({params}:{params:Promise<{collectionId:string}>}){const {collectionId}=use(params);return <CollectionDetail collectionId={collectionId}/>}
