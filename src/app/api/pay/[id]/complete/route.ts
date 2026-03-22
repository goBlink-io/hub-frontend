import { NextRequest, NextResponse } from 'next/server';
import { anonSupabase as supabase } from '@/lib/server/db';
import { decodePaymentRequest } from '@/lib/payment-requests';
import { logAudit, getClientIp } from '@/lib/server/audit';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Generate a completion token for a payment link.
 * HMAC(link_id, secret) — only the creator (who knows the link ID at creation time) can derive this.
 */
function generateCompletionToken(linkId: string): string {
  const secret = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY must be set for HMAC token generation');
  return createHmac('sha256', secret).update(linkId).digest('hex').slice(0, 32);
}

/**
 * POST /api/pay/[id]/complete
 * Called when the user signs the transaction. Marks link as 'processing'.
 * Requires a valid completion_token query param.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = decodePaymentRequest(id);

  if (!data) {
    return NextResponse.json({ error: 'Invalid link' }, { status: 400 });
  }

  // Verify completion token to prevent unauthorized marking
  const token = request.nextUrl.searchParams.get('completion_token');
  const expected = generateCompletionToken(id);
  if (!token || token.length !== expected.length || !timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
    return NextResponse.json({ error: 'Invalid or missing completion_token' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { sendTxHash, depositAddress, payerAddress, payerChain } = body;

  // Upsert — idempotent if called twice
  const { error } = await supabase
    .from('payment_link_status')
    .upsert({
      link_id: id,
      status: 'processing',
      recipient: data.recipient,
      to_chain: data.toChain,
      to_token: data.toToken,
      amount: data.amount,
      memo: data.memo || null,
      requester_name: data.name || null,
      link_created_at: data.createdAt,
      send_tx_hash: sendTxHash || null,
      deposit_address: depositAddress || null,
      payer_address: payerAddress || null,
      payer_chain: payerChain || null,
    }, { onConflict: 'link_id', ignoreDuplicates: false });

  if (error) {
    console.error('[pay-complete-post]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  const ip = getClientIp(request.headers);
  logAudit({
    actor: ip,
    action: 'payment_request.completed',
    resourceType: 'payment_request',
    resourceId: id,
    ipAddress: ip,
  });

  return NextResponse.json({ ok: true, status: 'processing' });
}

/**
 * PATCH /api/pay/[id]/complete
 * Called when 1Click confirms the on-chain outcome.
 * Promotes status from 'processing' → 'paid' or 'failed'.
 * Requires a valid completion_token query param.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Verify completion token
  const token = request.nextUrl.searchParams.get('completion_token');
  const expected = generateCompletionToken(id);
  if (!token || token.length !== expected.length || !timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
    return NextResponse.json({ error: 'Invalid or missing completion_token' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { fulfillmentTxHash, outcome } = body; // outcome: 'paid' | 'failed'

  const status = outcome === 'failed' ? 'failed' : 'paid';

  // Only promote from 'processing' — prevent status downgrade from terminal states
  const { error } = await supabase
    .from('payment_link_status')
    .update({
      status,
      paid_at: status === 'paid' ? new Date().toISOString() : null,
      fulfillment_tx_hash: fulfillmentTxHash || null,
    })
    .eq('link_id', id)
    .eq('status', 'processing');

  if (error) {
    console.error('[pay-complete-patch]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status });
}
