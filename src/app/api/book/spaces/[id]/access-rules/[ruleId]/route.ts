import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySpaceAccess } from "@/lib/book/verify-space-access";
import { getBookContext } from "@/lib/book/book-client";

const updateRuleSchema = z.object({
  min_amount: z.union([z.number().positive(), z.string().min(1).max(78)]).optional(),
  is_active: z.boolean().optional(),
  token_id: z.string().max(200).nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; ruleId: string }> },
) {
  const { id, ruleId } = await params;
  const ctx = await getBookContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await verifySpaceAccess(ctx.bookDb, id, ctx.user.id);
  if (role !== "owner" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateRuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if ("min_amount" in parsed.data)
    patch.min_amount = String(parsed.data.min_amount);
  if ("is_active" in parsed.data) patch.is_active = parsed.data.is_active;
  if ("token_id" in parsed.data) patch.token_id = parsed.data.token_id;

  const { data, error } = await ctx.bookDb
    .from("bb_access_rules")
    .update(patch)
    .eq("id", ruleId)
    .eq("space_id", id)
    .select("*")
    .maybeSingle();
  if (error) {
    console.error("[access-rule-patch]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; ruleId: string }> },
) {
  const { id, ruleId } = await params;
  const ctx = await getBookContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await verifySpaceAccess(ctx.bookDb, id, ctx.user.id);
  if (role !== "owner" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await ctx.bookDb
    .from("bb_access_rules")
    .delete()
    .eq("id", ruleId)
    .eq("space_id", id);
  if (error) {
    console.error("[access-rule-delete]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // If no rules left, flip is_gated back to false.
  const { count } = await ctx.bookDb
    .from("bb_access_rules")
    .select("*", { count: "exact", head: true })
    .eq("space_id", id)
    .eq("is_active", true);
  if ((count ?? 0) === 0) {
    await ctx.bookDb.from("bb_spaces").update({ is_gated: false }).eq("id", id);
  }

  return NextResponse.json({ success: true });
}
