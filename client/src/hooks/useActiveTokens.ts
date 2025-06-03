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
    console.log('DEBUG: useActiveTokens disabled for crash investigation');
    return [];
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