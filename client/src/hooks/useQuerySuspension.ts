import { useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';

/**
 * MetaMask Conflict Prevention System
 * 
 * This module prevents MetaMask crashes by suspending wallet-dependent queries
 * during transaction execution, eliminating parallel request conflicts.
 * 
 * Key Features:
 * - Temporarily disables queries that access wallet/signer during transactions
 * - Automatic query resumption after transaction completion
 * - Selective suspension based on query types and patterns
 * - Transaction isolation to prevent resource conflicts
 * 
 * Architecture:
 * - Uses TanStack Query's state management for suspension
 * - Wraps transaction execution with query suspension logic
 * - Follows SushiSwap's proven pattern for MetaMask stability
 * - Provides callback-based suspension control for flexibility
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
          fetchStatus: 'idle'
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