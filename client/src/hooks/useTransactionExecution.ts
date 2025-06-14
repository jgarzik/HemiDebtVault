import { useState, useEffect } from 'react';
import { useWaitForTransactionReceipt } from 'wagmi';
import { useQuerySuspension } from './useQuerySuspension';

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
      console.log('Starting transaction execution...');
      
      // Execute transaction and get hash
      const hash = await transactionFn();
      console.log('Transaction executed successfully, hash:', hash);
      
      setTxHash(hash);
      
      // Wait for confirmation by setting up the receipt watcher
      // The confirmation will be handled by the useWaitForTransactionReceipt hook
      return hash;
    } catch (err) {
      console.error('Transaction execution failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
      setError(errorMessage);
      setIsExecuting(false);
      throw err;
    }
  };

  // Reset when transaction is confirmed with proper cleanup
  useEffect(() => {
    if (isConfirmed && txHash) {
      const timeoutId = setTimeout(() => {
        setIsExecuting(false);
        setTxHash(null);
      }, 1000);

      // Cleanup timeout on unmount or dependency change
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [isConfirmed, txHash]);

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