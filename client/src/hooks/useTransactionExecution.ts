import { useState, useEffect, useRef } from 'react';
import { useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { useQuerySuspension } from './useQuerySuspension';

export function useTransactionExecution(onConfirmed?: () => void) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const { isSuspended } = useQuerySuspension();
  const publicClient = usePublicClient();
  
  // Use ref to persist transaction hash across re-renders
  const txHashRef = useRef<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Sync ref and state
  const setTxHashWithSync = (hash: string | null) => {
    txHashRef.current = hash;
    setTxHash(hash);
  };

  // Manual transaction confirmation polling - trigger immediately when hash is set
  const startPolling = async (hash: string) => {
    if (!publicClient) return;
    
    try {
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: hash as `0x${string}`,
        timeout: 60000, // 60 second timeout
      });
      
      setIsConfirmed(true);
      
      // Call the confirmation callback immediately
      if (onConfirmed) {
        onConfirmed();
      }
    } catch (error) {
      console.error('Error polling for transaction confirmation:', error);
    }
  };

  const execute = async (transactionFn: () => Promise<string>) => {
    setIsExecuting(true);
    setError(null);
    
    try {
      // Execute transaction and get hash
      const hash = await transactionFn();
      
      setTxHashWithSync(hash);
      setIsConfirmed(false); // Reset confirmation state for new transaction
      
      // Start polling immediately
      startPolling(hash);
      
      return hash;
    } catch (err) {
      console.error('Transaction execution failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
      setError(errorMessage);
      setIsExecuting(false);
      throw err;
    }
  };

  // Reset execution state when transaction is confirmed
  useEffect(() => {
    if (isConfirmed && txHash) {
      setIsExecuting(false);
    }
  }, [isConfirmed, txHash]);

  const reset = () => {
    setIsExecuting(false);
    setError(null);
    setTxHashWithSync(null);
    setIsConfirmed(false);
  };

  return {
    isExecuting,
    isConfirmed,
    error,
    execute,
    reset,
    txHash
  };
}