import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { anonSupabase as supabase } from '@/lib/server/db';
import { createHmac } from 'crypto';

// Simple in-memory rate limiter for payment link creation
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10; // 10 links per minute per IP
const ipCounts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipCounts.get(ip);
  if (!entry || now >= entry.resetAt) {
    ipCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function generateCompletionToken(linkId: string): string {
  const secret = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY must be set for HMAC token generation');
  return createHmac('sha256', secret).update(linkId).digest('hex').slice(0, 32);
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await request.json();
    const { recipient, toChain, toToken, amount, memo, name } = body;

    if (!recipient || !toChain || !toToken || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Input length and format validation (L-09)
    if (typeof recipient !== 'string' || recipient.trim().length > 100) {
      return NextResponse.json({ error: 'Recipient too long (max 100 chars)' }, { status: 400 });
    }
    const amountStr = String(amount).trim();
    if (!/^\d+(\.\d+)?$/.test(amountStr) || parseFloat(amountStr) <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }
    if (memo && (typeof memo !== 'string' || memo.trim().length > 200)) {
      return NextResponse.json({ error: 'Memo too long (max 200 chars)' }, { status: 400 });
    }
    if (name && (typeof name !== 'string' || name.trim().length > 50)) {
      return NextResponse.json({ error: 'Name too long (max 50 chars)' }, { status: 400 });
    }

    const id = nanoid(16);

    const { error } = await supabase.from('payment_links').insert({
      id,
      recipient: recipient.trim(),
      to_chain: toChain,
      to_token: toToken,
      amount: amountStr,
      memo: memo?.trim() || null,
      requester_name: name?.trim() || null,
    });

    if (error) {
      console.error('[pay/shorten] insert error:', error);
      return NextResponse.json({ error: 'Failed to create link' }, { status: 500 });
    }

    const origin = request.nextUrl.origin;
    const shortUrl = `${origin}/pay/${id}`;
    const completionToken = generateCompletionToken(id);

    return NextResponse.json({ id, url: shortUrl, completionToken });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
