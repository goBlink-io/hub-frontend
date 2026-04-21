import { NextResponse } from "next/server";
import { getStats, ZionError } from "@/lib/server/zion";

export const revalidate = 60;

export async function GET() {
  try {
    const data = await getStats();
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof ZionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
