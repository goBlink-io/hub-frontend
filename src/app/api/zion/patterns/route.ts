import { NextResponse } from "next/server";
import { getPatterns, ZionError } from "@/lib/server/zion";

export const revalidate = 300;

export async function GET() {
  try {
    const data = await getPatterns();
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof ZionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
