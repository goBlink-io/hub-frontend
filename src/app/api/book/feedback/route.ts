import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const feedbackSchema = z.object({
  space_id: z.string().uuid(),
  page_id: z.string().uuid(),
  helpful: z.boolean(),
  comment: z.string().max(2000).nullable().optional(),
  user_fingerprint: z.string().max(100).nullable().optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const spaceId = searchParams.get("space_id");
  if (!spaceId) return NextResponse.json({ error: "space_id required" }, { status: 400 });

  const supabase = await createClient();

  // Aggregate feedback per page
  const { data, error } = await supabase
    .from("bb_feedback")
    .select("page_id, helpful")
    .eq("space_id", spaceId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const map = new Map<string, { helpful: number; notHelpful: number }>();
  for (const row of data ?? []) {
    const entry = map.get(row.page_id) ?? { helpful: 0, notHelpful: 0 };
    if (row.helpful) entry.helpful++;
    else entry.notHelpful++;
    map.set(row.page_id, entry);
  }

  const summaries = Array.from(map.entries()).map(([page_id, counts]) => ({
    page_id,
    helpful_count: counts.helpful,
    not_helpful_count: counts.notHelpful,
    total: counts.helpful + counts.notHelpful,
    helpful_pct: counts.helpful + counts.notHelpful > 0
      ? Math.round((counts.helpful / (counts.helpful + counts.notHelpful)) * 100)
      : 0,
  }));

  return NextResponse.json(summaries);
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const body = await request.json();
  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  // Check for duplicate (same fingerprint + page)
  if (parsed.data.user_fingerprint) {
    const { data: existing } = await supabase
      .from("bb_feedback")
      .select("id")
      .eq("page_id", parsed.data.page_id)
      .eq("user_fingerprint", parsed.data.user_fingerprint)
      .single();
    if (existing) return NextResponse.json({ error: "Already voted" }, { status: 409 });
  }

  const { error } = await supabase.from("bb_feedback").insert(parsed.data);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true }, { status: 201 });
}
