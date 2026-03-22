import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifySpaceAccess } from "@/lib/book/verify-space-access";
import { enforceLimit, getRequiredPlan } from "@/lib/book/check-plan";
import { z } from "zod";

const createPageSchema = z.object({
  title: z.string().min(1).max(200).optional().default("Untitled"),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/).optional(),
  content: z.object({ type: z.literal("doc"), content: z.array(z.any()) }).optional(),
  parent_id: z.string().uuid().nullable().optional(),
  position: z.number().int().min(0).optional(),
  is_published: z.boolean().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await verifySpaceAccess(supabase, id, user.id);
  if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("bb_pages")
    .select("*")
    .eq("space_id", id)
    .order("position", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: space } = await supabase
    .from("bb_spaces")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!space) return NextResponse.json({ error: "Space not found" }, { status: 404 });

  const canCreate = await enforceLimit(user.id, "pages");
  if (!canCreate) {
    return NextResponse.json(
      { error: "upgrade_required", plan: getRequiredPlan("pages") },
      { status: 402 },
    );
  }

  const body = await request.json();
  const parsed = createPageSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.issues }, { status: 400 });
  }

  const { title, content, parent_id, position, is_published } = parsed.data;
  const slug = parsed.data.slug ?? (title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "untitled");

  let pos = position;
  if (pos === undefined) {
    const { count } = await supabase
      .from("bb_pages")
      .select("*", { count: "exact", head: true })
      .eq("space_id", id);
    pos = count ?? 0;
  }

  const { data, error } = await supabase
    .from("bb_pages")
    .insert({
      space_id: id,
      title,
      slug,
      content: content ?? { type: "doc", content: [] },
      parent_id: parent_id ?? null,
      position: pos,
      is_published: is_published ?? true,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A page with this slug already exists in this space" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
