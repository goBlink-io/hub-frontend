import { NextResponse } from "next/server";
import { signOut } from "@/lib/server/wallet-auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await signOut("blink");
  return NextResponse.json({ ok: true });
}
