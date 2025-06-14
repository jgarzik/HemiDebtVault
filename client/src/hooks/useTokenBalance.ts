import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { type Token } from '@/lib/tokens';
import { QUERY_CACHE_CONFIG } from '@/lib/constants';
import { getTokenBalance, getMultipleTokenBalances, formatTokenBalance } from '@/lib/rpcHelpers';

export function useTokenBalance(token?: Token) {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const { data: rawBalance, isLoading, error, refetch } = useQuery({
    queryKey: ['tokenBalance', token?.address, address],
    queryFn: async () => {
      if (!token || !address || !publicClient) return BigInt(0);
      
      return await publicClient.readContract({
        address: token.address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address],
      }) as bigint;
    },
    enabled: !!(token && address && publicClient),
    staleTime: QUERY_CACHE_CONFIG.STALE_TIME,
    gcTime: QUERY_CACHE_CONFIG.GC_TIME,
    retry: 1,
    retryDelay: 2000,
  });



  const formattedBalance = token && rawBalance 
    ? (() => {
        const formatted = formatUnits(rawBalance, token.decimals);
        const num = parseFloat(formatted);
        // Show more decimals for very small amounts
        if (num > 0 && num < 0.0001) {
          return num.toFixed(12);
        }
        return formatted;
      })()
    : '0';

  return {
    balance: rawBalance || BigInt(0),
    formattedBalance,
    isLoading,
    error,
    refetch,
  };
}

// Hook for fetching multiple token balances using direct RPC
export function useTokenBalances(tokens: Token[]) {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const { data: balances = [], isLoading } = useQuery({
    queryKey: ['tokenBalances', tokens.map(t => t.address), address],
    queryFn: async () => {
      if (!address || !publicClient || tokens.length === 0) return [];
      
      const balancePromises = tokens.map(async (token) => {
        try {
          const balance = await publicClient.readContract({
            address: token.address as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [address],
          }) as bigint;

          return {
            token,
            balance,
            formattedBalance: formatUnits(balance, token.decimals),
            isLoading: false,
          };
        } catch (error) {
          console.error(`Error fetching balance for ${token.symbol}:`, error);
          return {
            token,
            balance: BigInt(0),
            formattedBalance: '0',
            isLoading: false,
          };
        }
      });

      return Promise.all(balancePromises);
    },
    enabled: !!(address && publicClient && tokens.length > 0),
    staleTime: QUERY_CACHE_CONFIG.STALE_TIME,
    gcTime: QUERY_CACHE_CONFIG.GC_TIME,
  });

  return {
    balances,
    isLoading,
  };
}