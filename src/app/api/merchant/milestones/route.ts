import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!merchant) return NextResponse.json({ milestones: [] });

  const { data: milestones } = await adminSupabase
    .from("merchant_milestones")
    .select("milestone_key, achieved_at")
    .eq("merchant_id", merchant.id)
    .order("achieved_at", { ascending: false });

  return NextResponse.json({ milestones: milestones ?? [] });
}
