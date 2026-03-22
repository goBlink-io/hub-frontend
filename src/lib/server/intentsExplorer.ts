const INTENTS_EXPLORER_BASE_URL = 'https://explorer.near-intents.org';

interface Transaction {
  depositAddress: string;
  depositAddressAndMemo: string;
  originAsset: string;
  destinationAsset: string;
  amountIn: string;
  amountOut: string | null;
  recipient: string;
  refundTo: string;
  status: string;
  depositTxHash: string | null;
  fulfillmentTxHash: string | null;
  refundTxHash: string | null;
  createdAt: string;
  updatedAt: string;
  referral: string | null;
  affiliate: string | null;
}

interface TransactionsResponse {
  transactions: Transaction[];
  pagination: {
    hasMore: boolean;
    lastDepositAddressAndMemo: string | null;
    lastDepositAddress: string | null;
  };
}

class IntentsExplorerService {
  private jwtToken: string | null;

  constructor() {
    this.jwtToken = process.env.INTENTS_EXPLORER_JWT?.trim() || null;
  }

  isConfigured(): boolean {
    return this.jwtToken !== null && this.jwtToken.length > 0;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.jwtToken) headers['Authorization'] = `Bearer ${this.jwtToken}`;
    return headers;
  }

  async getTransactions(params?: {
    numberOfTransactions?: number;
    search?: string;
    [key: string]: unknown;
  }): Promise<TransactionsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.numberOfTransactions) queryParams.set('numberOfTransactions', String(params.numberOfTransactions));
    if (params?.search) queryParams.set('search', params.search);

    const url = `${INTENTS_EXPLORER_BASE_URL}/api/transactions${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await fetch(url, { headers: this.getHeaders(), signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`Explorer API error: ${response.status}`);
    return response.json();
  }

  async getTransactionByDepositAddress(depositAddress: string): Promise<Transaction | null> {
    try {
      const result = await this.getTransactions({ search: depositAddress, numberOfTransactions: 1 });
      return result.transactions.find(
        (t: Transaction) => t.depositAddress === depositAddress || t.depositAddressAndMemo?.startsWith(depositAddress)
      ) || null;
    } catch {
      return null;
    }
  }
}

export const intentsExplorer = new IntentsExplorerService();
