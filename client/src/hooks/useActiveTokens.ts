import { useQuery } from '@tanstack/react-query';
import { useAccount, usePublicClient } from 'wagmi';
import { findTokenByAddress } from '@/lib/tokens';
import { QUERY_CACHE_CONFIG } from '@/lib/constants';
import { queryDepositedEvents, extractUniqueTokens } from '@/lib/eventQueries';

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
      // Use shared event querying system
      const depositEvents = await queryDepositedEvents(publicClient, address);
      
      // Extract unique tokens using shared utility
      const uniqueTokens = extractUniqueTokens(depositEvents);
      console.log('DEBUG: Unique tokens found:', uniqueTokens);
      
      // Convert to ActiveToken format with safety checks
      const activeTokens: ActiveToken[] = [];
      for (const tokenAddress of uniqueTokens) {
        if (tokenAddress && typeof tokenAddress === 'string') {
          const token = findTokenByAddress(tokenAddress);
          activeTokens.push({
            address: tokenAddress,
            symbol: token?.symbol || 'UNKNOWN',
            decimals: token?.decimals || 18,
            name: token?.name || 'Unknown Token',
            hasActivity: true,
            activityTypes: ['deposits'],
          });
        }
      }

      console.log('DEBUG: Active tokens created:', activeTokens.length);
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