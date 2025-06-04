import { Token } from './tokens';

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
const STABLECOINS = new Set(['USDC', 'USDT', 'DAI', 'BUSD']);

/**
 * Get USD price for a token
 * Returns null if price cannot be determined
 */
export async function getTokenUSDPrice(token: Token): Promise<number | null> {
  // Stablecoins are always $1
  if (STABLECOINS.has(token.symbol)) {
    return 1.0;
  }

  // Check cache first
  const cached = priceCache.get(token.symbol);
  if (cached && Date.now() - cached.lastUpdated < PRICE_CACHE_DURATION) {
    return cached.price;
  }

  try {
    // For now, return null for non-stablecoins until price oracle is configured
    // This will prevent incorrect USD calculations
    return null;
  } catch (error) {
    console.warn(`Failed to fetch price for ${token.symbol}:`, error);
    return null;
  }
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