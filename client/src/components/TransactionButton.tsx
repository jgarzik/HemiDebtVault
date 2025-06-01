import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useReadContract } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { parseUnits } from 'viem';
import { hemiNetwork } from '@/lib/hemi';
import { Token } from '@/lib/tokens';
import { TransactionModal } from './TransactionModal';

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
] as const;

interface TransactionButtonProps {
  children: React.ReactNode;
  onExecute: () => Promise<void>;
  className?: string;
  disabled?: boolean;
  requiresApproval?: {
    token: Token;
    amount: string;
    spenderAddress: `0x${string}`;
  };
  actionLabel?: string;
}

export function TransactionButton({ 
  children, 
  onExecute, 
  className = '', 
  disabled = false,
  requiresApproval,
  actionLabel 
}: TransactionButtonProps) {
  const { address, isConnected, chainId } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { switchChain } = useSwitchChain();
  const { writeContract, data: hash, isPending: isWritePending } = useWriteContract();
  
  const [isApproving, setIsApproving] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<any>(null);
  const [approvalHash, setApprovalHash] = useState<string | null>(null);

  // Wait for approval transaction receipt
  const { isLoading: isApprovalLoading, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({
    hash: approvalHash as `0x${string}` | undefined,
  });

  // Check current allowance if approval is required
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    address: requiresApproval?.token.address,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && requiresApproval ? [address, requiresApproval.spenderAddress] : undefined,
    query: {
      enabled: !!(address && requiresApproval),
      refetchInterval: 1000, // Poll every second to detect approval changes
    },
  });

  // Calculate if approval is needed
  const needsApproval = requiresApproval && currentAllowance !== undefined
    ? currentAllowance < parseUnits(requiresApproval.amount, requiresApproval.token.decimals)
    : false;

  // Auto-proceed to action after approval succeeds
  useEffect(() => {
    if (isApprovalSuccess && !needsApproval && !isExecuting) {
      setIsApproving(false);
      setApprovalHash(null);
      // Auto-trigger the main action after approval
      setTimeout(() => {
        handleMainAction();
      }, 1000);
    }
  }, [isApprovalSuccess, needsApproval, isExecuting]);

  const handleMainAction = async () => {
    if (!requiresApproval) return;
    
    setIsExecuting(true);
    setModalData({
      title: `Confirm ${actionLabel || children}`,
      description: `Execute ${actionLabel || children} transaction`,
      action: actionLabel || children as string,
      amount: `${requiresApproval.amount} ${requiresApproval.token.symbol}`,
      gasEstimate: '~$2.50',
    });
    setShowModal(true);
  };

  const handleClick = async () => {
    // Step 1: Check wallet connection
    if (!isConnected) {
      openConnectModal?.();
      return;
    }

    // Step 2: Check network
    if (chainId !== hemiNetwork.id) {
      try {
        await switchChain({ chainId: hemiNetwork.id });
      } catch (error) {
        console.error('Failed to switch network:', error);
      }
      return;
    }

    // Step 3: Handle approval if needed
    if (needsApproval && requiresApproval) {
      setIsApproving(true);
      setModalData({
        title: `Approve ${requiresApproval.token.symbol}`,
        description: `Allow the contract to spend your ${requiresApproval.token.symbol} tokens`,
        action: 'Approve',
        amount: `${requiresApproval.amount} ${requiresApproval.token.symbol}`,
        gasEstimate: '~$1.50',
      });
      setShowModal(true);
      
      try {
        const approvalAmount = parseUnits(requiresApproval.amount, requiresApproval.token.decimals);
        
        const txHash = await writeContract({
          address: requiresApproval.token.address,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [requiresApproval.spenderAddress, approvalAmount],
        });
        
        if (txHash) {
          setApprovalHash(txHash);
        }
      } catch (error) {
        console.error('Approval failed:', error);
        setIsApproving(false);
        setShowModal(false);
      }
      return;
    }

    // Step 4: Execute the main action directly (no approval needed)
    handleMainAction();
  };

  const confirmTransaction = async () => {
    try {
      await onExecute();
      setShowModal(false);
    } catch (error) {
      console.error('Transaction failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  // Determine button state and label
  const getButtonState = () => {
    if (!isConnected) {
      return { label: 'Connect Wallet', loading: false };
    }
    
    if (chainId !== hemiNetwork.id) {
      return { label: 'Switch to Hemi', loading: false };
    }
    
    if (isApproving) {
      return { label: `Approving ${requiresApproval?.token.symbol}...`, loading: true };
    }
    
    if (needsApproval && requiresApproval) {
      return { label: `Approve ${requiresApproval.token.symbol}`, loading: false };
    }
    
    if (isExecuting) {
      return { label: 'Processing...', loading: true };
    }
    
    return { label: children, loading: false };
  };

  const { label, loading } = getButtonState();

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={disabled || loading}
        className={className}
      >
        {label}
      </Button>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={confirmTransaction}
        title={modalData?.title || ''}
        description={modalData?.description || ''}
        action={modalData?.action || ''}
        amount={modalData?.amount}
        gasEstimate={modalData?.gasEstimate}
        isLoading={isApproving || isExecuting || isApprovalLoading}
      />
    </>
  );
}