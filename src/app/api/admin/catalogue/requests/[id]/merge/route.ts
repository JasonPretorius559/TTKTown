import { FieldValue } from "firebase-admin/firestore";
import { type NextRequest, NextResponse } from "next/server";
import { adminDb, requireFirebaseUser } from "@/lib/firebase-admin";

const REFERENCE_COLLECTIONS=["listings","posts","collectionItems","ownedFigures","collectionFigures","wishlistItems"] as const;

export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  try{
    const actor=await requireFirebaseUser(request);const profile=await adminDb.doc(`users/${actor.uid}`).get();
    if(profile.data()?.role!=="ADMIN")return NextResponse.json({error:"Administrator access required"},{status:403});
    const {id}=await params;const body=await request.json() as {canonicalFigureId?:string};const canonicalFigureId=String(body.canonicalFigureId||"");
    if(!canonicalFigureId)return NextResponse.json({error:"Choose the verified catalogue figure"},{status:400});
    const requestRef=adminDb.doc(`figureRequests/${id}`);const requestSnapshot=await requestRef.get();
    if(!requestSnapshot.exists)return NextResponse.json({error:"Catalogue request not found"},{status:404});
    const submission=requestSnapshot.data()!;if(submission.status!=="PENDING")return NextResponse.json({error:"This request has already been reviewed"},{status:409});
    const sourceFigureId=String(submission.figureId||"");if(!sourceFigureId||sourceFigureId===canonicalFigureId)return NextResponse.json({error:"Choose a different canonical figure"},{status:400});
    const [sourceSnapshot,canonicalSnapshot]=await Promise.all([adminDb.doc(`figures/${sourceFigureId}`).get(),adminDb.doc(`figures/${canonicalFigureId}`).get()]);
    if(!sourceSnapshot.exists||!canonicalSnapshot.exists)return NextResponse.json({error:"One of the catalogue figures no longer exists"},{status:404});
    if(canonicalSnapshot.data()?.moderationStatus==="MERGED")return NextResponse.json({error:"Choose the final verified figure, not another merged record"},{status:400});
    const referenceSnapshots=await Promise.all(REFERENCE_COLLECTIONS.map(name=>adminDb.collectionGroup(name).where("figureId","==",sourceFigureId).get()));
    const writer=adminDb.bulkWriter();let migrated=0;
    referenceSnapshots.forEach(snapshot=>snapshot.docs.forEach(reference=>{writer.update(reference.ref,{figureId:canonicalFigureId,updatedAt:FieldValue.serverTimestamp()});migrated++}));
    await writer.close();
    const canonical=canonicalSnapshot.data()!;const source=sourceSnapshot.data()!;
    await adminDb.runTransaction(async transaction=>{
      transaction.update(adminDb.doc(`figures/${sourceFigureId}`),{moderationStatus:"MERGED",canonicalFigureId,mergedBy:actor.uid,mergedAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});
      transaction.update(adminDb.doc(`figures/${canonicalFigureId}`),{owned:FieldValue.increment(Number(source.owned||0)),wanted:FieldValue.increment(Number(source.wanted||0)),updatedAt:FieldValue.serverTimestamp()});
      transaction.update(requestRef,{status:"APPROVED",figureId:canonicalFigureId,mergedFromFigureId:sourceFigureId,reviewedBy:actor.uid,reviewedAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});
      transaction.set(adminDb.doc(`users/${submission.requesterId}/notifications/catalogue_${id}`),{id:`catalogue_${id}`,targetUserId:submission.requesterId,type:"CATALOGUE_MERGED",title:"Figure matched to the master catalogue",body:`Your submission now uses ${canonical.name}. Your collection and listings were kept intact.`,href:`/figures/${canonical.slug}`,read:false,time:"Just now",createdAt:FieldValue.serverTimestamp()});
      transaction.set(adminDb.doc(`auditLogs/catalogue_merged_${id}`),{id:`catalogue_merged_${id}`,action:"CATALOGUE_REQUEST_MERGED",actorId:actor.uid,targetId:id,sourceFigureId,canonicalFigureId,migratedReferences:migrated,createdAt:FieldValue.serverTimestamp()});
    });
    return NextResponse.json({figureId:canonicalFigureId,slug:canonical.slug,migrated});
  }catch(reason){const message=reason instanceof Error?reason.message:"Merge failed";return NextResponse.json({error:message},{status:message==="UNAUTHENTICATED"?401:500});}
}
