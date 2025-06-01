import { useAccount, useReadContract } from 'wagmi';
import { DEBT_VAULT_ABI } from '@/lib/contract';
import { DEBT_VAULT_ADDRESS } from '@/lib/hemi';
import { getAllTokens } from '@/lib/tokens';
import { formatUnits } from 'viem';

export function usePoolPosition() {
  const { address } = useAccount();
  const allTokens = getAllTokens();

  // Get deposits for each token
  const tokenBalances = allTokens.map(token => {
    const { data: balance } = useReadContract({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'deposits',
      args: address ? [address, token.address] : undefined,
      query: {
        enabled: !!address,
        refetchInterval: 5000, // Refetch every 5 seconds
      },
    });

    return {
      token,
      balance: balance || BigInt(0),
      formattedBalance: balance ? formatUnits(balance, token.decimals) : '0',
    };
  });

  // Calculate totals
  const totalDeposited = tokenBalances.reduce((sum, { balance, token }) => {
    // For simplicity, treat all tokens as $1 each for now
    // In a real app, you'd fetch USD prices from an oracle
    return sum + parseFloat(formatUnits(balance, token.decimals));
  }, 0);

  return {
    tokenBalances,
    totalDeposited,
    availableForLending: totalDeposited, // Simplified - would subtract actively lent amounts
    currentlyLent: 0, // Would calculate from active loans
    totalInterestEarned: 0, // Would calculate from loan history
  };
}