/**
 * Data Consistency Management System
 * 
 * This module provides centralized cache invalidation to ensure UI data consistency
 * across all loan, credit line, and portfolio operations after blockchain state changes.
 * 
 * Key Features:
 * - Hierarchical cache invalidation based on data relationships
 * - Immediate and delayed refresh strategies for optimal UX
 * - Transaction-specific invalidation patterns
 * - Coordinated updates across related data queries
 * 
 * Architecture:
 * - Uses TanStack Query's invalidation system
 * - Groups related queries for atomic cache updates
 * - Prevents stale data display after successful transactions
 * - Optimizes refresh timing to balance UX and performance
 */
import { QueryClient } from '@tanstack/react-query';
import { TRANSACTION_CONFIG } from './constants';

/**
 * Centralized cache invalidation utility to ensure consistency
 * across all loan, credit line, and portfolio data updates
 */
export class CacheInvalidationManager {
  constructor(private queryClient: QueryClient) {}

  /**
   * Invalidate all loan-related queries for a specific user
   */
  invalidateLoanQueries(userAddress?: string) {
    const queries = [
      ['borrowerLoans', userAddress],
      ['loans', userAddress],
      ['loanNFTs', userAddress],
    ].filter(query => query[1]); // Only include queries with valid address

    queries.forEach(queryKey => {
      this.queryClient.invalidateQueries({ queryKey });
    });
  }

  /**
   * Invalidate all credit line queries for a specific user
   */
  invalidateCreditLineQueries(userAddress?: string) {
    const queries = [
      ['borrowerCreditLines', userAddress],
      ['creditLines', userAddress],
    ].filter(query => query[1]); // Only include queries with valid address

    queries.forEach(queryKey => {
      this.queryClient.invalidateQueries({ queryKey });
    });
  }

  /**
   * Invalidate portfolio and metrics queries
   */
  invalidatePortfolioQueries(userAddress?: string) {
    if (!userAddress) return;

    this.queryClient.invalidateQueries({ 
      queryKey: ['portfolioMetrics'], 
      predicate: (query) => query.queryKey[1] === userAddress 
    });
    this.queryClient.invalidateQueries({ 
      queryKey: ['activeTokens', userAddress] 
    });
  }

  /**
   * Complete invalidation after loan repayment
   * Includes immediate and delayed refresh for optimal UX
   */
  invalidateAfterRepayment(userAddress?: string) {
    if (!userAddress) return;

    // Immediate invalidation for faster UI feedback
    this.invalidateLoanQueries(userAddress);
    this.invalidateCreditLineQueries(userAddress);

    // Delayed comprehensive refresh after blockchain confirmation
    setTimeout(() => {
      this.invalidateLoanQueries(userAddress);
      this.invalidateCreditLineQueries(userAddress);
      this.invalidatePortfolioQueries(userAddress);
    }, TRANSACTION_CONFIG.CONFIRMATION_DELAY);
  }

  /**
   * Complete invalidation after new loan creation
   */
  invalidateAfterBorrow(userAddress?: string) {
    if (!userAddress) return;

    // Immediate invalidation
    this.invalidateLoanQueries(userAddress);
    this.invalidateCreditLineQueries(userAddress);

    // Delayed comprehensive refresh
    setTimeout(() => {
      this.invalidateLoanQueries(userAddress);
      this.invalidateCreditLineQueries(userAddress);
      this.invalidatePortfolioQueries(userAddress);
    }, TRANSACTION_CONFIG.CONFIRMATION_DELAY);
  }

  /**
   * Invalidation after credit line updates (lender operations)
   */
  invalidateAfterCreditLineUpdate(userAddress?: string) {
    if (!userAddress) return;

    this.invalidateCreditLineQueries(userAddress);
    
    setTimeout(() => {
      this.invalidateCreditLineQueries(userAddress);
      this.invalidatePortfolioQueries(userAddress);
    }, TRANSACTION_CONFIG.CONFIRMATION_DELAY);
  }

  /**
   * Invalidation after deposit/withdrawal operations
   */
  invalidateAfterPoolOperation(userAddress?: string) {
    if (!userAddress) return;

    // Invalidate pool-related queries
    this.queryClient.invalidateQueries({ 
      queryKey: ['readContract'], 
      predicate: (query) => {
        const args = query.queryKey[1] as any;
        return args?.functionName === 'lenderDeposits' && args?.args?.[0] === userAddress;
      }
    });

    this.invalidateCreditLineQueries(userAddress);
    this.invalidatePortfolioQueries(userAddress);
  }
}

/**
 * Hook to get cache invalidation manager instance
 */
export function useCacheInvalidation(queryClient: QueryClient) {
  return new CacheInvalidationManager(queryClient);
}