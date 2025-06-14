/**
 * Direct RPC Communication Layer
 * 
 * This module provides centralized RPC helpers for blockchain queries that bypass
 * wagmi hooks to prevent MetaMask conflicts during transaction execution.
 * 
 * Key Features:
 * - Direct viem RPC client for read-only blockchain operations
 * - ERC-20 token interaction helpers with automatic decimals handling
 * - Balance formatting utilities for consistent UI display
 * - Error handling for network failures and invalid addresses
 * 
 * Architecture:
 * - Uses viem's createPublicClient for direct RPC calls
 * - Eliminates parallel wallet queries that crash MetaMask
 * - Provides consistent interface for all blockchain reads
 * - Supports token metadata fetching and balance checking
 */
import { createPublicClient, http, formatUnits } from 'viem';
import { hemiNetwork } from '@/lib/hemi';
import { type Token } from '@/lib/tokens';

// Centralized RPC client for all direct blockchain queries
export const publicRpcClient = createPublicClient({
  chain: hemiNetwork,
  transport: http(),
});

// Standard ERC-20 ABI for common operations
export const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  }
] as const;

/**
 * Helper to fetch token balance via direct RPC
 */
export async function getTokenBalance(tokenAddress: string, userAddress: string): Promise<bigint> {
  try {
    const balance = await publicRpcClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [userAddress as `0x${string}`],
    });
    return balance as bigint;
  } catch (error) {
    console.error(`Error fetching balance for ${tokenAddress}:`, error);
    return BigInt(0);
  }
}

/**
 * Helper to fetch token allowance via direct RPC
 */
export async function getTokenAllowance(
  tokenAddress: string, 
  owner: string, 
  spender: string
): Promise<bigint> {
  try {
    const allowance = await publicRpcClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [owner as `0x${string}`, spender as `0x${string}`],
    });
    return allowance as bigint;
  } catch (error) {
    console.error(`Error fetching allowance for ${tokenAddress}:`, error);
    return BigInt(0);
  }
}

/**
 * Helper to fetch multiple token balances in parallel
 */
export async function getMultipleTokenBalances(
  tokens: Token[], 
  userAddress: string
): Promise<Array<{ token: Token; balance: bigint; formattedBalance: string }>> {
  if (!tokens.length || !userAddress) return [];

  const balancePromises = tokens.map(async (token) => {
    const balance = await getTokenBalance(token.address, userAddress);
    return {
      token,
      balance,
      formattedBalance: formatUnits(balance, token.decimals),
    };
  });

  return Promise.all(balancePromises);
}

/**
 * Helper to format balance with proper decimal handling
 */
export function formatTokenBalance(balance: bigint, decimals: number): string {
  const formatted = formatUnits(balance, decimals);
  const num = parseFloat(formatted);
  
  // Show more decimals for very small amounts
  if (num > 0 && num < 0.0001) {
    return num.toFixed(12);
  }
  return formatted;
}