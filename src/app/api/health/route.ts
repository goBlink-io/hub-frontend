import { NextRequest, NextResponse } from 'next/server';
import * as oneclick from '@/lib/server/oneclick';
import { logger } from '@/lib/logger';

const TIMEOUT = 5000;

async function checkOneClickAPI(): Promise<{ status: 'ok' | 'error'; message?: string }> {
  try {
    await oneclick.getTokens();
    return { status: 'ok' };
  } catch {
    return { status: 'error', message: 'Service check failed' };
  }
}

async function fetchWithTimeout(url: string, body: unknown): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return resp;
  } finally {
    clearTimeout(id);
  }
}

async function runChecks() {
  const checks: Record<string, { status: 'ok' | 'error'; message?: string }> = {};

  checks.oneclick = await checkOneClickAPI();

  const solanaRpc = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  try {
    const response = await fetchWithTimeout(solanaRpc, { jsonrpc: '2.0', id: 1, method: 'getHealth' });
    const data = await response.json();
    checks.solana_rpc = data?.result === 'ok' ? { status: 'ok' } : { status: 'error', message: 'Unhealthy response' };
  } catch {
    checks.solana_rpc = { status: 'error', message: 'Service check failed' };
  }

  const nearRpc = process.env.NEAR_RPC_URL || 'https://rpc.fastnear.com';
  try {
    const response = await fetchWithTimeout(nearRpc, { jsonrpc: '2.0', id: 1, method: 'status', params: [] });
    const data = await response.json();
    checks.near_rpc = data?.result ? { status: 'ok' } : { status: 'error', message: 'No result' };
  } catch {
    checks.near_rpc = { status: 'error', message: 'Service check failed' };
  }

  const allHealthy = Object.values(checks).every(c => c.status === 'ok');
  if (!allHealthy) logger.warn('[HEALTH_CHECK]', 'Some services unhealthy:', checks);
  return { checks, allHealthy };
}

export async function GET(_request: NextRequest) {
  const { allHealthy } = await runChecks();
  const statusCode = allHealthy ? 200 : 503;
  return NextResponse.json(
    { status: allHealthy ? 'ok' : 'degraded', timestamp: new Date().toISOString() },
    { status: statusCode },
  );
}
