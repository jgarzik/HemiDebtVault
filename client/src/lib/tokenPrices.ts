import { Token } from './tokens';
import { createPublicClient, http, formatUnits } from 'viem';
import { hemiNetwork } from './hemi';

// Token price cache interface
interface TokenPrice {
  symbol: string;
  price: number;
  lastUpdated: number;
}

// Cache token prices for 5 minutes
const PRICE_CACHE_DURATION = 5 * 60 * 1000;
const priceCache = new Map<string, TokenPrice>();

// Known stablecoin mappings (always $1)
const STABLECOINS = new Set(['USDC.e', 'USDT', 'VUSD', 'VCRED']);

// Sushi V2 Router ABI for price queries
const SUSHI_V2_ROUTER_ABI = [
  {
    inputs: [
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' }
    ],
    name: 'getAmountsOut',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// SushiSwap V2 Router address on Hemi network (needs verification)
const SUSHI_V2_ROUTER_ADDRESS = '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506' as const;

// USDC.e address on Hemi (bridged USDC - our price reference)
const USDC_ADDRESS = '0xad11a8BEb98bbf61dbb1aa0F6d6F2ECD87b35afA' as const;

// Create public client for Hemi network
const publicClient = createPublicClient({
  chain: hemiNetwork,
  transport: http()
});

/**
 * Get USD price for a token
 * Returns null if price cannot be determined
 */
export async function getTokenUSDPrice(token: Token): Promise<number | null> {
  // Stablecoins are always $1
  if (STABLECOINS.has(token.symbol)) {
    return 1.0;
  }

  // For non-stablecoin tokens, return null to indicate unknown price
  // This prevents incorrect USD calculations while being transparent
  return null;
}

/**
 * Calculate total USD value for token balances
 * Only includes tokens with known USD prices
 */
export async function calculateUSDValue(tokenBalances: Array<{ token: Token; balance: bigint; formattedBalance: string }>): Promise<{
  totalUSD: number;
  knownValueTokens: number;
  unknownValueTokens: number;
}> {
  let totalUSD = 0;
  let knownValueTokens = 0;
  let unknownValueTokens = 0;

  for (const { token, formattedBalance } of tokenBalances) {
    const price = await getTokenUSDPrice(token);
    
    if (price !== null) {
      const tokenValue = parseFloat(formattedBalance) * price;
      totalUSD += tokenValue;
      knownValueTokens++;
    } else {
      unknownValueTokens++;
    }
  }

  return {
    totalUSD,
    knownValueTokens,
    unknownValueTokens
  };
}

/**
 * Format USD value with appropriate precision and uncertainty indicators
 */
export function formatUSDValue(
  usdValue: number, 
  unknownValueTokens: number,
  showUncertainty: boolean = true
): string {
  const formatted = usdValue.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (unknownValueTokens > 0 && showUncertainty) {
    return `${formatted}+`;
  }

  return formatted;
}