import { useState, useEffect } from 'react';
import { useAccount, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits } from 'viem';
import { Token } from '@/lib/tokens';
import { useTransactionBuilder } from './useTransactionBuilder';

const ERC20_ABI = [
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  }
];

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

  // Check current allowance
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    address: params?.token.address,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && params ? [address, params.spenderAddress] : undefined,
    query: {
      enabled: !!(address && params),
    }
  });

  // Wait for approval transaction receipt
  const { isLoading: isApprovalLoading, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({
    hash: approvalHash as `0x${string}` | undefined,
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