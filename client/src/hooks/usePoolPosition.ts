import { useAccount } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DEBT_VAULT_ABI } from '@/lib/contract';
import { DEBT_VAULT_ADDRESS } from '@/lib/hemi';
import { findTokenByAddress, Token } from '@/lib/tokens';
import { formatUnits } from 'viem';
import { QUERY_CACHE_CONFIG } from '@/lib/constants';
import { useActiveTokens } from './useActiveTokens';
import { calculateUSDValue, formatUSDValue } from '@/lib/tokenPrices';
import { publicRpcClient } from '@/lib/rpcHelpers';

export function usePoolPosition() {
  const { address } = useAccount();
  const { activeTokens } = useActiveTokens();

  // Only query tokens that have been discovered from actual blockchain activity
  const tokensToQuery = activeTokens.map(activeToken => {
    const token = findTokenByAddress(activeToken.address);
    return token;
  }).filter((token): token is Token => token !== undefined);

  // Use direct RPC calls to batch all balance queries
  const { data: balanceResults } = useQuery({
    queryKey: ['poolPositions', address, tokensToQuery.map(t => t.address)],
    queryFn: async () => {
      if (!address || tokensToQuery.length === 0) return [];
      
      const balancePromises = tokensToQuery.map(async (token) => {
        try {
          const balance = await publicRpcClient.readContract({
            address: DEBT_VAULT_ADDRESS,
            abi: DEBT_VAULT_ABI,
            functionName: 'lenderDeposits',
            args: [address as `0x${string}`, token.address as `0x${string}`],
          });
          return { status: 'success' as const, result: balance as bigint };
        } catch (error) {
          console.error(`Error fetching deposit for ${token.symbol}:`, error);
          return { status: 'failure' as const, result: BigInt(0) };
        }
      });

      return Promise.all(balancePromises);
    },
    enabled: !!address && tokensToQuery.length > 0,
    staleTime: QUERY_CACHE_CONFIG.STALE_TIME,
    gcTime: QUERY_CACHE_CONFIG.GC_TIME,
  });

  // Process the multicall results and filter for non-zero balances
  const tokenBalances = tokensToQuery.map((token, index) => {
    const result = balanceResults?.[index];
    const balance = result?.status === 'success' ? result.result as bigint : BigInt(0);
    
    return {
      token,
      balance,
      formattedBalance: formatUnits(balance, token.decimals),
    };
  }).filter(tokenBalance => {
    // Show tokens with non-zero balances OR tokens that have event history
    const hasBalance = tokenBalance.balance > BigInt(0);
    const hasActivity = activeTokens.some(activeToken => 
      activeToken.address.toLowerCase() === tokenBalance.token.address.toLowerCase()
    );
    return hasBalance || hasActivity;
  });

  // Calculate USD values using proper price conversion
  const { data: usdCalculation } = useQuery({
    queryKey: ['usdCalculation', tokenBalances.map(tb => `${tb.token.symbol}:${tb.formattedBalance}`)],
    queryFn: () => calculateUSDValue(tokenBalances),
    enabled: tokenBalances.length > 0,
    staleTime: QUERY_CACHE_CONFIG.STALE_TIME,
  });

  const queryClient = useQueryClient();

  // Function to invalidate and refetch pool data after transactions
  const invalidatePoolData = () => {
    if (address) {
      // Invalidate all lenderDeposits queries for this user
      queryClient.invalidateQueries({
        queryKey: ['readContract', { 
          address: DEBT_VAULT_ADDRESS,
          functionName: 'lenderDeposits',
          args: [address] 
        }]
      });
    }
  };

  const totalDepositedUSD = usdCalculation?.totalUSD || 0;
  const unknownValueTokens = usdCalculation?.unknownValueTokens || 0;

  return {
    tokenBalances,
    totalDeposited: formatUSDValue(totalDepositedUSD, unknownValueTokens),
    availableForLending: formatUSDValue(totalDepositedUSD, unknownValueTokens), // Simplified - would subtract actively lent amounts
    currentlyLent: '$0.00', // Would calculate from active loans
    totalInterestEarned: '$0.00', // Would calculate from loan history
    invalidatePoolData, // Expose this function to trigger manual refreshes
    hasUnknownValueTokens: unknownValueTokens > 0,
    knownValueTokens: usdCalculation?.knownValueTokens || 0,
  };
}