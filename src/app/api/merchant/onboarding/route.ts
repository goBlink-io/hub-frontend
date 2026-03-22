import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/server/db";
import { logAudit } from "@/lib/merchant/audit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    merchantId,
    businessName,
    displayCurrency,
    settlementChain,
    settlementToken,
    walletAddress,
  } = body;

  if (!merchantId || !businessName || !settlementChain || !settlementToken || !walletAddress) {
    return NextResponse.json(
      { error: { message: "Missing required fields" } },
      { status: 400 }
    );
  }

  // Verify ownership
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("id", merchantId)
    .eq("user_id", user.id)
    .single();

  if (!merchant) {
    return NextResponse.json(
      { error: { message: "Merchant not found" } },
      { status: 404 }
    );
  }

  const { error } = await adminSupabase
    .from("merchants")
    .update({
      business_name: businessName.trim(),
      display_currency: displayCurrency || "USD",
      settlement_chain: settlementChain,
      settlement_token: settlementToken,
      wallet_address: walletAddress.trim(),
      onboarding_completed: true,
      onboarding_checklist: {
        account_created: true,
        wallet_connected: true,
        settlement_configured: true,
        first_link_created: false,
        test_payment_completed: false,
        webhook_configured: false,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", merchantId);

  if (error) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: 500 }
    );
  }

  await logAudit({
    merchantId,
    actor: user.id,
    action: "onboarding.completed",
    metadata: {
      businessName,
      settlementChain,
      settlementToken,
      displayCurrency,
    },
  });

  return NextResponse.json({ success: true });
}
