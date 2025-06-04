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
 * Get USD price for a token using Sushi DEX on Hemi network
 * Returns null if price cannot be determined
 */
export async function getTokenUSDPrice(token: Token): Promise<number | null> {
  // Stablecoins are always $1 (no need to query)
  if (STABLECOINS.has(token.symbol)) {
    return 1.0;
  }

  // USDC.e is our reference, always $1
  if (token.address.toLowerCase() === USDC_ADDRESS.toLowerCase()) {
    return 1.0;
  }

  // Check cache first
  const cached = priceCache.get(token.symbol);
  if (cached && Date.now() - cached.lastUpdated < PRICE_CACHE_DURATION) {
    return cached.price;
  }

  try {
    // Query Sushi router for token/USDC price
    // We'll swap 1 token unit to see how much USDC we get
    const amountIn = BigInt(10 ** token.decimals); // 1 token unit
    const path = [token.address as `0x${string}`, USDC_ADDRESS];

    const result = await publicClient.readContract({
      address: SUSHI_V2_ROUTER_ADDRESS,
      abi: SUSHI_V2_ROUTER_ABI,
      functionName: 'getAmountsOut',
      args: [amountIn, path],
    });

    if (result && result.length >= 2) {
      const usdcOut = result[1]; // Amount of USDC we'd get
      
      // Ensure we got a meaningful amount (not zero)
      if (usdcOut > BigInt(0)) {
        const price = parseFloat(formatUnits(usdcOut, 6)); // USDC.e has 6 decimals
        
        // Cache the price
        priceCache.set(token.symbol, {
          symbol: token.symbol,
          price,
          lastUpdated: Date.now(),
        });
        
        return price;
      }
    }

    // Try reverse path if direct path fails (USDC -> Token)
    const reversePath = [USDC_ADDRESS, token.address as `0x${string}`];
    const reverseAmountIn = BigInt(10 ** 6); // 1 USDC
    
    const reverseResult = await publicClient.readContract({
      address: SUSHI_V2_ROUTER_ADDRESS,
      abi: SUSHI_V2_ROUTER_ABI,
      functionName: 'getAmountsOut',
      args: [reverseAmountIn, reversePath],
    });

    if (reverseResult && reverseResult.length >= 2) {
      const tokenOut = reverseResult[1];
      
      if (tokenOut > BigInt(0)) {
        // Calculate price as 1 / (tokens per USDC)
        const tokensPerUSDC = parseFloat(formatUnits(tokenOut, token.decimals));
        const price = 1 / tokensPerUSDC;
        
        // Cache the price
        priceCache.set(token.symbol, {
          symbol: token.symbol,
          price,
          lastUpdated: Date.now(),
        });
        
        return price;
      }
    }

    return null;
  } catch (error) {
    console.warn(`Failed to fetch price for ${token.symbol} from Sushi:`, error);
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