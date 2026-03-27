import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifySpaceAccess } from "@/lib/book/verify-space-access";
import { z } from "zod";

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
    .from("bb_versions")
    .select("*")
    .eq("space_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error('[versions-get]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
  return NextResponse.json(data);
}

const createVersionSchema = z.object({
  label: z.string().min(1).max(50),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await verifySpaceAccess(supabase, id, user.id);
  if (!role || role === "viewer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = createVersionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  // Create version record
  const { data: version, error: vError } = await supabase
    .from("bb_versions")
    .insert({ space_id: id, label: parsed.data.label })
    .select()
    .single();

  if (vError) {
    console.error('[versions-post]', vError);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  // Snapshot all published pages
  const { data: pages } = await supabase
    .from("bb_pages")
    .select("*")
    .eq("space_id", id)
    .eq("is_published", true)
    .order("position", { ascending: true });

  if (pages && pages.length > 0) {
    const versionPages = pages.map((p) => ({
      version_id: version.id,
      page_id: p.id,
      title: p.title,
      slug: p.slug,
      content: p.content,
      parent_id: p.parent_id,
      position: p.position,
    }));

    await supabase.from("bb_version_pages").insert(versionPages);
  }

  return NextResponse.json(version, { status: 201 });
}
