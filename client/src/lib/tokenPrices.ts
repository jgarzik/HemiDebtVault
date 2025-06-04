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
    // Use CoinGecko API to fetch token prices
    // This is a free API that provides reliable cryptocurrency price data
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${getCoingeckoId(token.symbol)}&vs_currencies=usd`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Price API error: ${response.status}`);
    }

    const data = await response.json();
    const coingeckoId = getCoingeckoId(token.symbol);
    
    if (data[coingeckoId]?.usd) {
      const price = data[coingeckoId].usd;
      
      // Cache the price
      priceCache.set(token.symbol, {
        symbol: token.symbol,
        price,
        lastUpdated: Date.now(),
      });
      
      return price;
    }

    return null;
  } catch (error) {
    console.warn(`Failed to fetch price for ${token.symbol}:`, error);
    return null;
  }
}

/**
 * Map token symbols to CoinGecko IDs
 */
function getCoingeckoId(symbol: string): string {
  const symbolMap: Record<string, string> = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'USDC': 'usd-coin',
    'USDT': 'tether',
    'DAI': 'dai',
    'WBTC': 'wrapped-bitcoin',
    'WETH': 'weth',
    'MAX': 'maxi-protocol', // Update this with correct CoinGecko ID for MAX token
  };

  return symbolMap[symbol] || symbol.toLowerCase();
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