import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enforceLimit, getRequiredPlan } from "@/lib/book/check-plan";
import { z } from "zod";

const createSpaceSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(63).regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/),
  description: z.string().max(500).nullable().optional(),
  theme: z
    .object({
      preset: z.string().optional(),
      primary: z.string().optional(),
      secondary: z.string().optional(),
      background: z.string().optional(),
      surface: z.string().optional(),
      border: z.string().optional(),
    })
    .optional(),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("bb_spaces")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error('[spaces-get]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createSpaceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.issues }, { status: 400 });
  }

  const { name, slug, description, theme } = parsed.data;

  const canCreate = await enforceLimit(user.id, "spaces");
  if (!canCreate) {
    return NextResponse.json(
      { error: "upgrade_required", plan: getRequiredPlan("spaces") },
      { status: 402 },
    );
  }

  const { data: existing } = await supabase.from("bb_spaces").select("id").eq("slug", slug).single();

  if (existing) {
    return NextResponse.json({ error: "This slug is already taken" }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("bb_spaces")
    .insert({
      user_id: user.id,
      name,
      slug,
      description: description ?? null,
      theme: theme ?? { preset: "midnight" },
    })
    .select("id")
    .single();

  if (error) {
    console.error('[spaces-post]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
