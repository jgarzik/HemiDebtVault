import { useAccount, useReadContract } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { DEBT_VAULT_ABI } from '@/lib/contract';
import { DEBT_VAULT_ADDRESS } from '@/lib/hemi';
import { getAllTokens, findTokenByAddress, Token } from '@/lib/tokens';
import { formatUnits } from 'viem';
import { QUERY_CACHE_CONFIG } from '@/lib/constants';
import { useActiveTokens } from './useActiveTokens';

export function usePoolPosition() {
  const { address } = useAccount();
  const allTokens = getAllTokens();
  const { activeTokens } = useActiveTokens();

  // Get tokens that have been deposited (from events) + query their current balances
  const tokensToQuery = activeTokens.length > 0 
    ? activeTokens.map(activeToken => {
        const token = findTokenByAddress(activeToken.address);
        return token;
      }).filter((token): token is Token => token !== undefined)
    : allTokens.slice(0, 3); // Fallback to first 3 tokens if no events found

  // Use a single contract read for the first token only to avoid hooks in loops
  const firstToken = tokensToQuery[0];
  const { data: firstBalance } = useReadContract({
    address: DEBT_VAULT_ADDRESS,
    abi: DEBT_VAULT_ABI,
    functionName: 'lenderDeposits',
    args: address && firstToken ? [address, firstToken.address] : undefined,
    query: {
      enabled: !!address && !!firstToken,
      refetchInterval: false,
      staleTime: QUERY_CACHE_CONFIG.STALE_TIME,
      gcTime: QUERY_CACHE_CONFIG.GC_TIME,
    },
  });

  // For now, only show the first token to avoid the hooks-in-loops issue
  const tokenBalances = firstToken && firstBalance ? [{
    token: firstToken,
    balance: firstBalance,
    formattedBalance: formatUnits(firstBalance, firstToken.decimals),
  }].filter(tokenBalance => tokenBalance.balance > BigInt(0)) : [];

  // Calculate totals
  const totalDeposited = tokenBalances.reduce((sum, { balance, token }) => {
    // For simplicity, treat all tokens as $1 each for now
    // In a real app, you'd fetch USD prices from an oracle
    return sum + parseFloat(formatUnits(balance, token.decimals));
  }, 0);

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

  return {
    tokenBalances,
    totalDeposited,
    availableForLending: totalDeposited, // Simplified - would subtract actively lent amounts
    currentlyLent: 0, // Would calculate from active loans
    totalInterestEarned: 0, // Would calculate from loan history
    invalidatePoolData, // Expose this function to trigger manual refreshes
  };
}