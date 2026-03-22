import { createClient } from "@/lib/supabase/server";

export type Plan = "free" | "pro" | "team" | "business";

type PlanLimits = {
  spaces: number;
  pages: number;
  team: number;
  pageviews: number;
};

const LIMITS: Record<Plan, PlanLimits> = {
  free: { spaces: 1, pages: 20, team: 0, pageviews: 1000 },
  pro: { spaces: 3, pages: Infinity, team: 0, pageviews: 50000 },
  team: { spaces: 10, pages: Infinity, team: 10, pageviews: 250000 },
  business: { spaces: Infinity, pages: Infinity, team: 25, pageviews: 1000000 },
};

export async function getUserPlan(userId: string): Promise<Plan> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bb_subscriptions")
    .select("plan, status")
    .eq("user_id", userId)
    .single();

  if (!data || data.status === "canceled") return "free";
  return data.plan as Plan;
}

export async function enforceLimit(
  userId: string,
  limit: keyof PlanLimits,
  spaceId?: string,
): Promise<boolean> {
  const plan = await getUserPlan(userId);
  const max = LIMITS[plan][limit];
  if (max === Infinity) return true;

  const supabase = await createClient();

  if (limit === "spaces") {
    const { count } = await supabase
      .from("bb_spaces")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    return (count ?? 0) < max;
  }

  if (limit === "pages") {
    const { data: spaces } = await supabase
      .from("bb_spaces")
      .select("id")
      .eq("user_id", userId);
    if (!spaces?.length) return true;
    const { count } = await supabase
      .from("bb_pages")
      .select("*", { count: "exact", head: true })
      .in("space_id", spaces.map((s) => s.id));
    return (count ?? 0) < max;
  }

  if (limit === "team" && spaceId) {
    const { count } = await supabase
      .from("bb_team_members")
      .select("*", { count: "exact", head: true })
      .eq("space_id", spaceId)
      .eq("status", "accepted");
    return (count ?? 0) < max;
  }

  if (limit === "pageviews") {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("bb_pageviews")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", startOfMonth.toISOString());
    return (count ?? 0) < max;
  }

  return false;
}

export function getRequiredPlan(limit: keyof PlanLimits): Plan {
  if (limit === "team") return "team";
  return "pro";
}
