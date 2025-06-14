/**
 * Transaction Cache Management System
 * 
 * This module provides centralized cache invalidation utilities that ensure
 * consistent data updates across all loan, credit line, and portfolio queries
 * after blockchain transactions complete.
 * 
 * Key Features:
 * - Automatic cache invalidation based on transaction type
 * - Coordinated refresh of related data (loans, balances, portfolios)
 * - Standard success handlers for consistent UX patterns
 * - Type-safe transaction categorization
 * 
 * Architecture:
 * - Wraps CacheInvalidationManager for transaction-specific logic
 * - Provides hooks for transaction success handling
 * - Ensures UI reflects blockchain state changes immediately
 * - Prevents stale data after successful transactions
 */
import { useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { CacheInvalidationManager } from './cacheInvalidation';

/**
 * Centralized transaction cache management helper
 */
export function useTransactionCacheManager() {
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const cacheManager = new CacheInvalidationManager(queryClient);

  const invalidateAfterTransaction = (transactionType: 'repay' | 'borrow' | 'deposit' | 'withdraw' | 'creditLine') => {
    switch (transactionType) {
      case 'repay':
        cacheManager.invalidateAfterRepayment(address);
        break;
      case 'borrow':
        cacheManager.invalidateAfterBorrow(address);
        break;
      case 'deposit':
      case 'withdraw':
        cacheManager.invalidateAfterPoolOperation(address);
        break;
      case 'creditLine':
        cacheManager.invalidateAfterCreditLineUpdate(address);
        break;
    }
  };

  return {
    invalidateAfterTransaction,
    cacheManager,
  };
}

/**
 * Standard transaction success handler
 */
export function createTransactionSuccessHandler(
  transactionType: 'repay' | 'borrow' | 'deposit' | 'withdraw' | 'creditLine',
  onSuccess?: () => void
) {
  return () => {
    const queryClient = useQueryClient();
    const { address } = useAccount();
    const cacheManager = new CacheInvalidationManager(queryClient);
    
    // Invalidate relevant caches
    switch (transactionType) {
      case 'repay':
        cacheManager.invalidateAfterRepayment(address);
        break;
      case 'borrow':
        cacheManager.invalidateAfterBorrow(address);
        break;
      case 'deposit':
      case 'withdraw':
        cacheManager.invalidateAfterPoolOperation(address);
        break;
      case 'creditLine':
        cacheManager.invalidateAfterCreditLineUpdate(address);
        break;
    }
    
    // Execute custom success callback
    if (onSuccess) {
      onSuccess();
    }
  };
}