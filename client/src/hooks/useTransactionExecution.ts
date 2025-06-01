import { useState } from 'react';
import { useWaitForTransactionReceipt } from 'wagmi';

export function useTransactionExecution() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Wait for transaction confirmation
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}` | undefined,
  });

  const execute = async (transactionFn: () => Promise<string>) => {
    setIsExecuting(true);
    setError(null);
    
    try {
      // Execute transaction and get hash
      const hash = await transactionFn();
      setTxHash(hash);
      
      // Wait for confirmation by setting up the receipt watcher
      // The confirmation will be handled by the useWaitForTransactionReceipt hook
      return hash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
      setError(errorMessage);
      setIsExecuting(false);
      throw err;
    }
  };

  // Reset when transaction is confirmed
  if (isConfirmed && txHash) {
    console.log('Transaction confirmed:', txHash);
    setTimeout(() => {
      setIsExecuting(false);
      setTxHash(null);
    }, 1000);
  }

  const reset = () => {
    setIsExecuting(false);
    setError(null);
    setTxHash(null);
  };

  return {
    isExecuting: isExecuting || isConfirming,
    isConfirming,
    isConfirmed,
    error,
    execute,
    reset,
    txHash
  };
}