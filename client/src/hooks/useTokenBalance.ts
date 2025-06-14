/**
 * Token Balance Query System
 * 
 * This module provides real-time token balance queries using direct RPC calls
 * to prevent MetaMask conflicts while maintaining efficient caching patterns.
 * 
 * Key Features:
 * - Direct RPC balance queries for individual and multiple tokens
 * - Automatic balance formatting with proper decimal handling
 * - Efficient caching with optimized refresh intervals
 * - Error handling with retry logic for network failures
 * - Support for batch balance queries across token portfolios
 * 
 * Architecture:
 * - Uses direct RPC calls instead of wagmi hooks to prevent wallet conflicts
 * - Integrates with TanStack Query for intelligent caching
 * - Provides formatted balances ready for UI display
 * - Handles edge cases like zero balances and invalid tokens
 */
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { type Token } from '@/lib/tokens';
import { QUERY_CACHE_CONFIG } from '@/lib/constants';
import { getTokenBalance, getMultipleTokenBalances, formatTokenBalance } from '@/lib/rpcHelpers';

export function useTokenBalance(token?: Token) {
  const { address } = useAccount();

  const { data: rawBalance, isLoading, error, refetch } = useQuery({
    queryKey: ['tokenBalance', token?.address, address],
    queryFn: async () => {
      if (!token || !address) return BigInt(0);
      return await getTokenBalance(token.address, address);
    },
    enabled: !!(token && address),
    staleTime: QUERY_CACHE_CONFIG.STALE_TIME,
    gcTime: QUERY_CACHE_CONFIG.GC_TIME,
    retry: 1,
    retryDelay: 2000,
  });

  const formattedBalance = token && rawBalance 
    ? formatTokenBalance(rawBalance, token.decimals)
    : '0';

  return {
    balance: rawBalance || BigInt(0),
    formattedBalance,
    isLoading,
    error,
    refetch,
  };
}

// Hook for fetching multiple token balances using centralized RPC helper
export function useTokenBalances(tokens: Token[]) {
  const { address } = useAccount();

  const { data: balances = [], isLoading } = useQuery({
    queryKey: ['tokenBalances', tokens.map(t => t.address), address],
    queryFn: async () => {
      if (!address || tokens.length === 0) return [];
      return await getMultipleTokenBalances(tokens, address);
    },
    enabled: !!(address && tokens.length > 0),
    staleTime: QUERY_CACHE_CONFIG.STALE_TIME,
    gcTime: QUERY_CACHE_CONFIG.GC_TIME,
  });

  return {
    balances,
    isLoading,
  };
}