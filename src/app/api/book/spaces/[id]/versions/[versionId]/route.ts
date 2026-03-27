import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifySpaceAccess } from "@/lib/book/verify-space-access";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> },
) {
  const { id, versionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await verifySpaceAccess(supabase, id, user.id);
  if (!role || role === "viewer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();

  if (body.is_current === true) {
    // Unset all other versions
    await supabase.from("bb_versions").update({ is_current: false }).eq("space_id", id);
    const { data, error } = await supabase
      .from("bb_versions")
      .update({ is_current: true })
      .eq("id", versionId)
      .eq("space_id", id)
      .select()
      .single();
    if (error) {
      console.error('[versions-versionId-patch]', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> },
) {
  const { id, versionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await verifySpaceAccess(supabase, id, user.id);
  if (!role || role === "viewer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Delete version pages first
  await supabase.from("bb_version_pages").delete().eq("version_id", versionId);
  const { error } = await supabase.from("bb_versions").delete().eq("id", versionId).eq("space_id", id);

  if (error) {
    console.error('[versions-versionId-delete]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
