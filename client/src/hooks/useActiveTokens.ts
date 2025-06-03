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
      const activeTokens = new Map<string, ActiveToken>();
      
      // Get tokens from CreditLineUpdated events (where user is lender)
      const creditLineEvents = await publicClient.getLogs({
        address: DEBT_VAULT_ADDRESS,
        event: {
          type: 'event',
          name: 'CreditLineUpdated',
          inputs: [
            { type: 'address', name: 'lender', indexed: true },
            { type: 'address', name: 'borrower', indexed: true },
            { type: 'address', name: 'token', indexed: true },
            { type: 'uint256', name: 'creditLimit' },
            { type: 'uint256', name: 'minAPR' },
            { type: 'uint256', name: 'maxAPR' },
            { type: 'uint256', name: 'originationFee' }
          ]
        },
        args: {
          lender: address,
        },
        fromBlock: 'earliest',
        toBlock: 'latest',
      });

      // Get tokens from Deposited events
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

      // Get tokens from LoanCreated events (where user is lender)
      const loanEvents = await publicClient.getLogs({
        address: DEBT_VAULT_ADDRESS,
        event: {
          type: 'event',
          name: 'LoanCreated',
          inputs: [
            { type: 'uint256', name: 'loanId', indexed: true },
            { type: 'address', name: 'borrower', indexed: true },
            { type: 'address', name: 'lender', indexed: true },
            { type: 'address', name: 'token' },
            { type: 'uint256', name: 'amount' },
            { type: 'uint256', name: 'principal' },
            { type: 'uint256', name: 'apr' },
            { type: 'uint256', name: 'originationFee' }
          ]
        },
        args: {
          lender: address,
        },
        fromBlock: 'earliest',
        toBlock: 'latest',
      });

      // Process credit line events
      for (const log of creditLineEvents) {
        const tokenAddress = log.args.token as string;
        const token = findTokenByAddress(tokenAddress);
        if (token) {
          const existing = activeTokens.get(tokenAddress.toLowerCase());
          const activityTypes = existing ? [...existing.activityTypes] : [];
          if (!activityTypes.includes('credit_lines')) {
            activityTypes.push('credit_lines');
          }
          
          activeTokens.set(tokenAddress.toLowerCase(), {
            address: tokenAddress,
            symbol: token.symbol,
            decimals: token.decimals,
            name: token.name,
            hasActivity: true,
            activityTypes,
          });
        }
      }

      // Process deposit events
      for (const log of depositEvents) {
        const tokenAddress = log.args.token as string;
        const token = findTokenByAddress(tokenAddress);
        if (token) {
          const existing = activeTokens.get(tokenAddress.toLowerCase());
          const activityTypes = existing ? [...existing.activityTypes] : [];
          if (!activityTypes.includes('deposits')) {
            activityTypes.push('deposits');
          }
          
          activeTokens.set(tokenAddress.toLowerCase(), {
            address: tokenAddress,
            symbol: token.symbol,
            decimals: token.decimals,
            name: token.name,
            hasActivity: true,
            activityTypes,
          });
        }
      }

      // Process loan events
      for (const log of loanEvents) {
        const tokenAddress = log.args.token as string;
        const token = findTokenByAddress(tokenAddress);
        if (token) {
          const existing = activeTokens.get(tokenAddress.toLowerCase());
          const activityTypes = existing ? [...existing.activityTypes] : [];
          if (!activityTypes.includes('loans')) {
            activityTypes.push('loans');
          }
          
          activeTokens.set(tokenAddress.toLowerCase(), {
            address: tokenAddress,
            symbol: token.symbol,
            decimals: token.decimals,
            name: token.name,
            hasActivity: true,
            activityTypes,
          });
        }
      }

      return Array.from(activeTokens.values());
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