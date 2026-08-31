import { NextRequest, NextResponse } from "next/server";
import { requireFirebaseUser } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await requireFirebaseUser(request);
    const token = request.headers.get("authorization")?.slice(7);
    if (!token) return NextResponse.json({ error:"Missing token" }, { status:401 });
    const response = NextResponse.json({ ok:true });
    response.cookies.set("__session", token, {
      httpOnly:true, secure:process.env.NODE_ENV === "production", sameSite:"lax",
      path:"/", maxAge:50 * 60
    });
    return response;
  } catch {
    return NextResponse.json({ error:"Unauthorized" }, { status:401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok:true });
  response.cookies.set("__session", "", { httpOnly:true, path:"/", maxAge:0 });
  return response;
}
