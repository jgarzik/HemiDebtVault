import { useState } from 'react';

export function useTransactionExecution() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (transactionFn: () => Promise<void>) => {
    setIsExecuting(true);
    setError(null);
    
    try {
      await transactionFn();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsExecuting(false);
    }
  };

  const reset = () => {
    setIsExecuting(false);
    setError(null);
  };

  return {
    isExecuting,
    error,
    execute,
    reset
  };
}