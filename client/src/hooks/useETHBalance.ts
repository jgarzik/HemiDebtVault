import { useBalance, useAccount } from 'wagmi';

export function useETHBalance() {
  const { address } = useAccount();

  const { data: balance, isLoading, error } = useBalance({
    address,
    query: {
      enabled: !!address,
      refetchInterval: false,
      retry: 1,
    },
  });

  return {
    balance: balance?.value || BigInt(0),
    formatted: balance?.formatted || '0',
    symbol: balance?.symbol || 'ETH',
    isLoading,
    error,
  };
}