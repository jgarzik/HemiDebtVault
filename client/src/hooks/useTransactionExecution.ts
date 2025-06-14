import { useState, useEffect } from 'react';
import { useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { useQuerySuspension } from './useQuerySuspension';

export function useTransactionExecution() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const { isSuspended } = useQuerySuspension();
  const publicClient = usePublicClient();

  // Manual transaction confirmation polling as wagmi receipt hook isn't working reliably
  useEffect(() => {
    if (txHash && publicClient && !isConfirmed) {
      console.log('Starting manual transaction confirmation polling for:', txHash);
      console.log('Public client available:', !!publicClient);
      
      const pollForConfirmation = async () => {
        try {
          console.log('Calling waitForTransactionReceipt...');
          const receipt = await publicClient.waitForTransactionReceipt({
            hash: txHash as `0x${string}`,
            timeout: 60000, // 60 second timeout
          });
          
          console.log('Transaction confirmed via manual polling:', receipt);
          setIsConfirmed(true);
        } catch (error) {
          console.error('Error polling for transaction confirmation:', error);
          console.error('Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            txHash,
            publicClientExists: !!publicClient
          });
        }
      };

      pollForConfirmation();
    } else {
      console.log('Polling conditions not met:', {
        hasTxHash: !!txHash,
        hasPublicClient: !!publicClient,
        isAlreadyConfirmed: isConfirmed
      });
    }
  }, [txHash, publicClient, isConfirmed]);

  const execute = async (transactionFn: () => Promise<string>) => {
    setIsExecuting(true);
    setError(null);
    
    try {
      console.log('Starting transaction execution...');
      
      // Execute transaction and get hash
      const hash = await transactionFn();
      console.log('Transaction executed successfully, hash:', hash);
      
      setTxHash(hash);
      setIsConfirmed(false); // Reset confirmation state for new transaction
      console.log('Set transaction hash for manual confirmation polling:', hash);
      
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
    setTxHash(null);
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