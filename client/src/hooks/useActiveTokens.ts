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
      console.log('DEBUG: Starting event query for address:', address);
      
      // Query Deposited events with proper error handling
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

      console.log('DEBUG: Found deposit events:', depositEvents.length);

      if (!Array.isArray(depositEvents)) {
        console.warn('Deposit events is not an array:', depositEvents);
        return [];
      }

      // Safely extract token addresses
      const tokenAddresses: string[] = [];
      for (const event of depositEvents) {
        if (event?.args?.token && typeof event.args.token === 'string') {
          tokenAddresses.push(event.args.token);
        }
      }

      // Get unique tokens
      const uniqueTokens = [...new Set(tokenAddresses)];
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