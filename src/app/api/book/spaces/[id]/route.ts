import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySpaceAccess } from "@/lib/book/verify-space-access";
import { getBookContext } from "@/lib/book/book-client";

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
const BRAND_FONTS = [
  "Inter",
  "Roboto",
  "Source Sans Pro",
  "Merriweather",
  "JetBrains Mono",
] as const;

const updateSpaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/)
    .optional(),
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
  logo_url: z.string().nullable().optional(),
  custom_domain: z.string().nullable().optional(),
  is_published: z.boolean().optional(),
  brand_logo_url: z.string().url().nullable().optional(),
  brand_primary_color: z.string().regex(HEX_COLOR).optional(),
  brand_accent_color: z.string().regex(HEX_COLOR).optional(),
  brand_font: z.enum(BRAND_FONTS).optional(),
  brand_hide_powered_by: z.boolean().optional(),
  review_reminder_enabled: z.boolean().optional(),
  review_reminder_days: z.number().int().min(7).max(365).optional(),
  llms_txt_enabled: z.boolean().optional(),
  meta_title: z.string().max(200).nullable().optional(),
  meta_description: z.string().max(500).nullable().optional(),
  og_image_url: z.string().url().nullable().optional(),
  favicon_url: z.string().url().nullable().optional(),
  social_twitter: z.string().max(50).nullable().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getBookContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await verifySpaceAccess(ctx.bookDb, id, ctx.user.id);
  if (!role) return NextResponse.json({ error: "Space not found" }, { status: 404 });

  const { data, error } = await ctx.bookDb
    .from("bb_spaces")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getBookContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await verifySpaceAccess(ctx.bookDb, id, ctx.user.id);
  if (role !== "owner" && role !== "admin" && role !== "editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateSpaceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.issues },
      { status: 400 },
    );
  }

  if (parsed.data.slug) {
    const { data: existing } = await ctx.bookDb
      .from("bb_spaces")
      .select("id")
      .eq("slug", parsed.data.slug)
      .neq("id", id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "This slug is already taken" }, { status: 409 });
    }
  }

  // Ownership enforcement: owner-only for slug/domain/publish changes.
  const ownerOnlyFields = ["slug", "custom_domain", "is_published"] as const;
  if (role !== "owner") {
    for (const key of ownerOnlyFields) {
      if (key in parsed.data) {
        return NextResponse.json(
          { error: `Only the owner can change ${key}` },
          { status: 403 },
        );
      }
    }
  }

  const update = ctx.bookDb.from("bb_spaces").update(parsed.data).eq("id", id);
  if (role === "owner") {
    update.eq("user_id", ctx.user.id);
  }
  const { data, error } = await update.select().maybeSingle();

  if (error) {
    console.error("[spaces-id-patch]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getBookContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await ctx.bookDb
    .from("bb_spaces")
    .delete()
    .eq("id", id)
    .eq("user_id", ctx.user.id);

  if (error) {
    console.error("[spaces-id-delete]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
