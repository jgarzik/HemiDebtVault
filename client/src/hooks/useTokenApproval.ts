import { useState, useEffect } from 'react';
import { useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { useQuery } from '@tanstack/react-query';
import { Token } from '@/lib/tokens';
import { useTransactionBuilder } from './useTransactionBuilder';
import { useQuerySuspension } from './useQuerySuspension';
import { QUERY_CACHE_CONFIG } from '@/lib/constants';
import { getTokenAllowance } from '@/lib/rpcHelpers';

interface ApprovalParams {
  token: Token;
  amount: string;
  spenderAddress: `0x${string}`;
}

export function useTokenApproval(params?: ApprovalParams) {
  const { address } = useAccount();
  const { approveToken, isExecuting } = useTransactionBuilder();
  const [approvalHash, setApprovalHash] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const { isSuspended } = useQuerySuspension();

  // Check current allowance via centralized RPC helper
  const { data: currentAllowance, refetch: refetchAllowance } = useQuery({
    queryKey: ['tokenAllowance', params?.token.address, address, params?.spenderAddress],
    queryFn: async () => {
      if (!params || !address) return BigInt(0);
      return await getTokenAllowance(params.token.address, address, params.spenderAddress);
    },
    enabled: !!(address && params) && !isSuspended,
    staleTime: QUERY_CACHE_CONFIG.STALE_TIME,
    gcTime: QUERY_CACHE_CONFIG.GC_TIME,
  });

  // Wait for approval transaction receipt (suspended during other transactions)
  const { isLoading: isApprovalLoading, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({
    hash: !isSuspended ? (approvalHash as `0x${string}` | undefined) : undefined,
  });

  // Check if approval is needed
  const needsApproval = params && currentAllowance !== undefined && currentAllowance !== null
    ? (currentAllowance as bigint) < parseUnits(params.amount, params.token.decimals)
    : false;

  const approve = async () => {
    if (!params || !address) return;

    setIsApproving(true);
    try {
      const approvalAmount = parseUnits(params.amount, params.token.decimals);
      
      const hash = await approveToken(
        params.token.address,
        params.spenderAddress,
        approvalAmount
      );
      
      setApprovalHash(hash);
      
    } catch (error) {
      console.error('Approval failed:', error);
      setIsApproving(false);
      throw error;
    }
  };

  // Handle approval success - reset state and refetch allowance
  useEffect(() => {
    if (isApprovalSuccess && approvalHash) {
      console.log('Approval transaction confirmed, resetting state...');
      
      // Immediately refetch allowance to update state
      refetchAllowance();
      
      // Reset approval state after a brief delay with proper cleanup
      const timeoutId = setTimeout(() => {
        setApprovalHash(null);
        setIsApproving(false);
      }, 500);

      // Cleanup timeout on unmount or dependency change
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [isApprovalSuccess, approvalHash, refetchAllowance]);

  return {
    needsApproval,
    isApproving: isApproving && !isApprovalSuccess, // Don't show approving if already successful
    isApprovalSuccess,
    approve,
    currentAllowance,
    refetchAllowance
  };
}