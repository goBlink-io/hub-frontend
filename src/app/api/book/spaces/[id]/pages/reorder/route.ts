import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const reorderSchema = z.object({
  pages: z.array(
    z.object({
      id: z.string().uuid(),
      parent_id: z.string().uuid().nullable(),
      position: z.number().int().min(0),
    }),
  ),
});

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
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (!space) return NextResponse.json({ error: "Space not found" }, { status: 404 });
  if (space.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = reorderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.issues }, { status: 400 });
  }

  const updates = parsed.data.pages.map((page: { id: string; parent_id: string | null; position: number }) =>
    supabase
      .from("bb_pages")
      .update({ parent_id: page.parent_id, position: page.position })
      .eq("id", page.id)
      .eq("space_id", id),
  );

  const results = await Promise.all(updates);
  const failed = results.find((r: { error: unknown }) => r.error);

  if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
