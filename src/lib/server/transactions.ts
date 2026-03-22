/**
 * Transaction service for managing persistent transaction history
 * Integrates with Intents Explorer for status syncing
 */

import { supabase } from './db';
import { intentsExplorer } from './intentsExplorer';
import { logger } from '../logger';

export interface TransactionRecord {
  id?: string;
  wallet_address: string;
  wallet_chain: string;
  deposit_address?: string | null;
  from_chain: string;
  from_token: string;
  to_chain: string;
  to_token: string;
  amount_in: string;
  amount_out?: string | null;
  amount_usd?: number | null;
  recipient: string;
  refund_to?: string | null;
  status: string;
  deposit_tx_hash?: string | null;
  fulfillment_tx_hash?: string | null;
  refund_tx_hash?: string | null;
  fee_bps?: number | null;
  fee_amount?: string | null;
  quote_id?: string | null;
  source?: string | null;
  payment_request_id?: string | null;
  error_message?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateTransactionData {
  walletAddress: string;
  walletChain: string;
  depositAddress?: string;
  fromChain: string;
  fromToken: string;
  toChain: string;
  toToken: string;
  amountIn: string;
  amountOut?: string;
  amountUsd?: number;
  recipient: string;
  refundTo?: string;
  status?: string;
  depositTxHash?: string;
  feeBps?: number;
  feeAmount?: string;
  quoteId?: string;
  source?: string;
  paymentRequestId?: string;
}

export interface UpdateTransactionData {
  status?: string;
  amountOut?: string;
  depositTxHash?: string;
  fulfillmentTxHash?: string;
  refundTxHash?: string;
  errorMessage?: string;
}

export interface GetTransactionsOptions {
  page?: number;
  limit?: number;
  status?: string;
}

/**
 * Create a new transaction record
 */
export async function createTransaction(
  data: CreateTransactionData
): Promise<{ success: boolean; transaction?: TransactionRecord; error?: string }> {
  try {
    const record: Partial<TransactionRecord> = {
      wallet_address: data.walletAddress.toLowerCase(),
      wallet_chain: data.walletChain,
      deposit_address: data.depositAddress || null,
      from_chain: data.fromChain,
      from_token: data.fromToken,
      to_chain: data.toChain,
      to_token: data.toToken,
      amount_in: data.amountIn,
      amount_out: data.amountOut || null,
      amount_usd: data.amountUsd ?? null,
      recipient: data.recipient,
      refund_to: data.refundTo || null,
      status: data.status || 'pending',
      deposit_tx_hash: data.depositTxHash || null,
      fee_bps: data.feeBps ?? null,
      fee_amount: data.feeAmount || null,
      quote_id: data.quoteId || null,
      source: data.source || 'swap',
      payment_request_id: data.paymentRequestId || null,
    };

    const { data: inserted, error } = await supabase
      .from('transaction_history')
      .insert(record)
      .select()
      .single();

    if (error) {
      logger.error('[CREATE_TRANSACTION_ERROR]', error);
      return { success: false, error: error.message };
    }

    logger.info('[TRANSACTION_CREATED]', { id: inserted.id, depositAddress: data.depositAddress });
    return { success: true, transaction: inserted };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[CREATE_TRANSACTION_EXCEPTION]', message);
    return { success: false, error: message };
  }
}

/**
 * Update transaction status and details by deposit address
 */
export async function updateTransactionStatus(
  depositAddress: string,
  updates: UpdateTransactionData
): Promise<{ success: boolean; transaction?: TransactionRecord; error?: string }> {
  try {
    const updateData: Partial<TransactionRecord> = {};
    
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.amountOut !== undefined) updateData.amount_out = updates.amountOut;
    if (updates.depositTxHash !== undefined) updateData.deposit_tx_hash = updates.depositTxHash;
    if (updates.fulfillmentTxHash !== undefined) updateData.fulfillment_tx_hash = updates.fulfillmentTxHash;
    if (updates.refundTxHash !== undefined) updateData.refund_tx_hash = updates.refundTxHash;
    if (updates.errorMessage !== undefined) updateData.error_message = updates.errorMessage;

    const { data: updated, error } = await supabase
      .from('transaction_history')
      .update(updateData)
      .eq('deposit_address', depositAddress)
      .select()
      .single();

    if (error) {
      logger.error('[UPDATE_TRANSACTION_ERROR]', error);
      return { success: false, error: error.message };
    }

    logger.info('[TRANSACTION_UPDATED]', { depositAddress, status: updates.status });
    return { success: true, transaction: updated };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[UPDATE_TRANSACTION_EXCEPTION]', message);
    return { success: false, error: message };
  }
}

/**
 * Get transactions by wallet address (paginated)
 */
export async function getTransactionsByWallet(
  walletAddress: string | string[],
  options: GetTransactionsOptions = {}
): Promise<{ success: boolean; transactions?: TransactionRecord[]; total?: number; error?: string }> {
  try {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    // Support querying multiple wallet addresses at once
    const addresses = Array.isArray(walletAddress)
      ? walletAddress.map(a => a.toLowerCase())
      : [walletAddress.toLowerCase()];

    let query = supabase
      .from('transaction_history')
      .select('*', { count: 'exact' })
      .in('wallet_address', addresses)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (options.status) {
      query = query.eq('status', options.status);
    }

    const { data, error, count } = await query;

    if (error) {
      logger.error('[GET_TRANSACTIONS_ERROR]', error);
      return { success: false, error: error.message };
    }

    return { success: true, transactions: data || [], total: count || 0 };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[GET_TRANSACTIONS_EXCEPTION]', message);
    return { success: false, error: message };
  }
}

/**
 * Search transactions by wallet address, deposit address, or tx hash
 */
export async function searchTransactions(
  query: string
): Promise<{ success: boolean; transactions?: TransactionRecord[]; error?: string }> {
  try {
    const searchTerm = query.trim().toLowerCase();

    if (!searchTerm) {
      return { success: true, transactions: [] };
    }

    // Sanitize search term — strip PostgREST special characters to prevent filter injection
    const safe = searchTerm.replace(/[,.*()%_]/g, '');

    if (!safe) {
      return { success: true, transactions: [] };
    }

    const { data, error } = await supabase
      .from('transaction_history')
      .select('*')
      .or(
        `wallet_address.ilike.%${safe}%,` +
        `deposit_address.ilike.%${safe}%,` +
        `deposit_tx_hash.ilike.%${safe}%,` +
        `fulfillment_tx_hash.ilike.%${safe}%,` +
        `refund_tx_hash.ilike.%${safe}%`
      )
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      logger.error('[SEARCH_TRANSACTIONS_ERROR]', error);
      return { success: false, error: error.message };
    }

    return { success: true, transactions: data || [] };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[SEARCH_TRANSACTIONS_EXCEPTION]', message);
    return { success: false, error: message };
  }
}

/**
 * Get a single transaction by ID
 */
export async function getTransaction(
  id: string
): Promise<{ success: boolean; transaction?: TransactionRecord; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('transaction_history')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'Transaction not found' };
      }
      logger.error('[GET_TRANSACTION_ERROR]', error);
      return { success: false, error: error.message };
    }

    return { success: true, transaction: data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[GET_TRANSACTION_EXCEPTION]', message);
    return { success: false, error: message };
  }
}

/**
 * Sync transaction status from Intents Explorer
 */
export async function syncTransactionStatus(
  depositAddress: string
): Promise<{ success: boolean; transaction?: TransactionRecord; synced?: boolean; error?: string }> {
  try {
    if (!intentsExplorer.isConfigured()) {
      return { success: false, error: 'Intents Explorer not configured' };
    }

    // Fetch latest data from Intents Explorer
    const explorerTx = await intentsExplorer.getTransactionByDepositAddress(depositAddress);
    
    if (!explorerTx) {
      return { success: false, error: 'Transaction not found in Intents Explorer' };
    }

    // Update local record with latest data
    const updates: UpdateTransactionData = {
      status: explorerTx.status.toLowerCase(),
      amountOut: explorerTx.amountOut || undefined,
      depositTxHash: explorerTx.depositTxHash || undefined,
      fulfillmentTxHash: explorerTx.fulfillmentTxHash || undefined,
      refundTxHash: explorerTx.refundTxHash || undefined,
    };

    const result = await updateTransactionStatus(depositAddress, updates);
    
    if (result.success) {
      logger.info('[TRANSACTION_SYNCED]', { depositAddress, status: explorerTx.status });
      return { success: true, transaction: result.transaction, synced: true };
    }

    return result;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[SYNC_TRANSACTION_EXCEPTION]', message);
    return { success: false, error: message };
  }
}
