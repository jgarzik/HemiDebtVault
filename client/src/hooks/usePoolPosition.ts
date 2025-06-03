import { useAccount, useReadContract } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { DEBT_VAULT_ABI } from '@/lib/contract';
import { DEBT_VAULT_ADDRESS } from '@/lib/hemi';
import { getAllTokens } from '@/lib/tokens';
import { formatUnits } from 'viem';
import { QUERY_CACHE_CONFIG } from '@/lib/constants';
import { useActiveTokens } from './useActiveTokens';

export function usePoolPosition() {
  const { address } = useAccount();
  const allTokens = getAllTokens();
  const { activeTokens } = useActiveTokens();

  // Create a smart list of tokens to show:
  // 1. Tokens with non-zero balances
  // 2. Tokens that have been active in credit lines, deposits, or loans
  const relevantTokens = allTokens.filter(token => {
    // Always include tokens that have been active in the contract
    const isActive = activeTokens.some(activeToken => 
      activeToken.address.toLowerCase() === token.address.toLowerCase()
    );
    return isActive;
  });

  // If no active tokens found, show a minimal default set
  const tokensToQuery = relevantTokens.length > 0 ? relevantTokens : allTokens.slice(0, 3);

  // Get lender deposits for relevant tokens only
  const tokenBalances = tokensToQuery.map(token => {
    const { data: balance } = useReadContract({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'lenderDeposits',
      args: address ? [address, token.address] : undefined,
      query: {
        enabled: !!address,
        refetchInterval: false, // Disable automatic polling
        staleTime: QUERY_CACHE_CONFIG.STALE_TIME,
        gcTime: QUERY_CACHE_CONFIG.GC_TIME,
      },
    });

    return {
      token,
      balance: balance || BigInt(0),
      formattedBalance: balance ? formatUnits(balance, token.decimals) : '0',
    };
  }).filter(tokenBalance => {
    // Only show tokens with non-zero balances or active contract history
    const hasBalance = tokenBalance.balance > BigInt(0);
    const hasActivity = activeTokens.some(activeToken => 
      activeToken.address.toLowerCase() === tokenBalance.token.address.toLowerCase()
    );
    return hasBalance || hasActivity;
  });

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