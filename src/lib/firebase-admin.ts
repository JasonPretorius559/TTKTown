import { App, cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { DecodedIdToken, getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import type { NextRequest } from "next/server";

const serviceAccount=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const adminApp: App = getApps().length ? getApp() : initializeApp({
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  ...(serviceAccount?{credential:cert(JSON.parse(serviceAccount))}:{})
});

export const adminDb=getFirestore(adminApp);

export async function verifyFirebaseToken(token: string) {
  return getAuth(adminApp).verifyIdToken(token);
}

export function getFirebaseRequestToken(request:NextRequest){const header=request.headers.get("authorization");return header?.startsWith("Bearer ")?header.slice(7):request.cookies.get("__session")?.value||null}

export async function requireFirebaseUser(request: NextRequest): Promise<DecodedIdToken> {
  const token = getFirebaseRequestToken(request);
  if (!token) throw new Error("UNAUTHENTICATED");
  return verifyFirebaseToken(token);
}
