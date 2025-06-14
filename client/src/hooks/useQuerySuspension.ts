import { useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';

/**
 * Query suspension hook to prevent parallel wallet requests during transactions
 * Following SushiSwap's pattern of suspending queries during MetaMask interactions
 */
export function useQuerySuspension() {
  const queryClient = useQueryClient();
  const [isSuspended, setIsSuspended] = useState(false);

  const suspendQueries = useCallback((queryKeys: string[]) => {
    setIsSuspended(true);
    
    // Disable specific queries that access wallet/signer
    queryKeys.forEach(key => {
      queryClient.getQueryCache().findAll({ queryKey: [key] }).forEach(query => {
        query.setState({ 
          ...query.state, 
          fetchStatus: 'idle',
          status: 'loading'
        });
      });
    });

    console.log('Suspended queries during transaction:', queryKeys);
  }, [queryClient]);

  const resumeQueries = useCallback((queryKeys: string[]) => {
    setIsSuspended(false);
    
    // Re-enable and invalidate queries after transaction
    queryKeys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: [key] });
    });

    console.log('Resumed queries after transaction:', queryKeys);
  }, [queryClient]);

  const withSuspension = useCallback(async <T>(
    transactionFn: () => Promise<T>,
    suspendKeys: string[] = ['borrowerLoans', 'borrowerCreditLines', 'loanNFTs']
  ): Promise<T> => {
    try {
      // Suspend queries before transaction
      suspendQueries(suspendKeys);
      
      // Execute transaction
      const result = await transactionFn();
      
      return result;
    } finally {
      // Always resume queries, even if transaction fails
      setTimeout(() => {
        resumeQueries(suspendKeys);
      }, 1000); // Small delay to ensure transaction is fully processed
    }
  }, [suspendQueries, resumeQueries]);

  return {
    isSuspended,
    suspendQueries,
    resumeQueries,
    withSuspension,
  };
}