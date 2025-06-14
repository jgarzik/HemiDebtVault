import { useState, useEffect, useRef } from 'react';
import { useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { useQuerySuspension } from './useQuerySuspension';

export function useTransactionExecution() {
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
    console.log('Setting transaction hash (both ref and state):', hash);
    txHashRef.current = hash;
    setTxHash(hash);
  };

  // Manual transaction confirmation polling - trigger immediately when hash is set
  const startPolling = async (hash: string) => {
    if (!publicClient) {
      console.log('No public client available for polling');
      return;
    }
    
    console.log('Starting manual transaction confirmation polling for:', hash);
    
    try {
      console.log('Calling waitForTransactionReceipt...');
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: hash as `0x${string}`,
        timeout: 60000, // 60 second timeout
      });
      
      console.log('Transaction confirmed via manual polling:', receipt);
      setIsConfirmed(true);
      console.log('Set isConfirmed to true for hash:', hash);
    } catch (error) {
      console.error('Error polling for transaction confirmation:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        hash,
        publicClientExists: !!publicClient
      });
    }
  };

  const execute = async (transactionFn: () => Promise<string>) => {
    setIsExecuting(true);
    setError(null);
    
    try {
      console.log('Starting transaction execution...');
      
      // Execute transaction and get hash
      const hash = await transactionFn();
      console.log('Transaction executed successfully, hash:', hash);
      
      setTxHashWithSync(hash);
      setIsConfirmed(false); // Reset confirmation state for new transaction
      console.log('Set transaction hash for manual confirmation polling:', hash);
      
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
      console.log('Transaction confirmed, stopping execution state');
      setIsExecuting(false);
      // Keep txHash available for reference, only clear on explicit reset
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