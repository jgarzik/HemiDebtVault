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