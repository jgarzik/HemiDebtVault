import { useReadContract, useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import { type Token } from '@/lib/tokens';

// Standard ERC-20 ABI for balance checking
const ERC20_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export function useTokenBalance(token?: Token) {
  const { address } = useAccount();

  const { data: rawBalance, isLoading, error, refetch } = useReadContract({
    address: token?.address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!(token && address),
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  });

  const formattedBalance = token && rawBalance 
    ? formatUnits(rawBalance, token.decimals)
    : '0';

  return {
    balance: rawBalance || BigInt(0),
    formattedBalance,
    isLoading,
    error,
    refetch,
  };
}

// Hook for fetching multiple token balances
export function useTokenBalances(tokens: Token[]) {
  const { address } = useAccount();

  const balanceQueries = tokens.map(token => ({
    address: token.address,
    abi: ERC20_ABI,
    functionName: 'balanceOf' as const,
    args: address ? [address] : undefined,
  }));

  // Note: This would need to be implemented with useReadContracts in Wagmi v2
  // For now, we'll return a structure that can be used with individual calls
  return {
    balances: tokens.map(token => {
      const { data: balance, isLoading } = useReadContract({
        address: token.address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: {
          enabled: !!(token && address),
        },
      });

      return {
        token,
        balance: balance || BigInt(0),
        formattedBalance: balance ? formatUnits(balance, token.decimals) : '0',
        isLoading,
      };
    }),
  };
}