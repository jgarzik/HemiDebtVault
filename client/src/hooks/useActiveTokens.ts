import { useQuery } from '@tanstack/react-query';
import { useAccount, usePublicClient } from 'wagmi';
import { DEBT_VAULT_ABI } from '@/lib/contract';
import { DEBT_VAULT_ADDRESS } from '@/lib/hemi';
import { getAllTokens, findTokenByAddress } from '@/lib/tokens';
import { QUERY_CACHE_CONFIG } from '@/lib/constants';

interface ActiveToken {
  address: string;
  symbol: string;
  decimals: number;
  name: string;
  hasActivity: boolean;
  activityTypes: string[];
}

export function useActiveTokens() {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const fetchActiveTokens = async (): Promise<ActiveToken[]> => {
    if (!address || !publicClient) return [];

    try {
      // Query Deposited events for current user
      const depositEvents = await publicClient.getLogs({
        address: DEBT_VAULT_ADDRESS,
        event: {
          type: 'event',
          name: 'Deposited',
          inputs: [
            { type: 'address', name: 'lender', indexed: true },
            { type: 'address', name: 'token', indexed: true },
            { type: 'uint256', name: 'amount' }
          ]
        },
        args: {
          lender: address,
        },
        fromBlock: 'earliest',
        toBlock: 'latest',
      });

      // Extract unique tokens from deposit events
      const tokenSet = new Set(depositEvents.map(log => log.args.token as string));
      const uniqueTokens = Array.from(tokenSet);
      
      // Convert to ActiveToken format
      const activeTokens: ActiveToken[] = uniqueTokens.map(tokenAddress => {
        const token = findTokenByAddress(tokenAddress);
        return {
          address: tokenAddress,
          symbol: token?.symbol || 'UNKNOWN',
          decimals: token?.decimals || 18,
          name: token?.name || 'Unknown Token',
          hasActivity: true,
          activityTypes: ['deposits'],
        };
      });

      return activeTokens;
    } catch (error) {
      console.error('Error fetching active tokens:', error);
      return [];
    }
  };

  const { data: activeTokens = [], isLoading, refetch } = useQuery({
    queryKey: ['activeTokens', address],
    queryFn: fetchActiveTokens,
    enabled: !!address && !!publicClient,
    staleTime: QUERY_CACHE_CONFIG.STALE_TIME,
    gcTime: QUERY_CACHE_CONFIG.GC_TIME,
  });

  return {
    activeTokens,
    isLoading,
    refetch,
  };
}