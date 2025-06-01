import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useReadContract } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { parseUnits } from 'viem';
import { hemiNetwork } from '@/lib/hemi';
import { Token } from '@/lib/tokens';

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
}

export function TransactionButton({ 
  children, 
  onExecute, 
  className = '', 
  disabled = false,
  requiresApproval 
}: TransactionButtonProps) {
  const { address, isConnected, chainId } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { switchChain } = useSwitchChain();
  const { writeContract } = useWriteContract();
  
  const [isApproving, setIsApproving] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  // Check current allowance if approval is required
  const { data: currentAllowance } = useReadContract({
    address: requiresApproval?.token.address,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && requiresApproval ? [address, requiresApproval.spenderAddress] : undefined,
    query: {
      enabled: !!(address && requiresApproval),
      refetchInterval: false,
    },
  });

  // Calculate if approval is needed
  const needsApproval = requiresApproval && currentAllowance !== undefined
    ? currentAllowance < parseUnits(requiresApproval.amount, requiresApproval.token.decimals)
    : false;

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
      try {
        const approvalAmount = parseUnits(requiresApproval.amount, requiresApproval.token.decimals);
        
        await writeContract({
          address: requiresApproval.token.address,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [requiresApproval.spenderAddress, approvalAmount],
        });
        
        // Wait a moment for the approval to be processed
        setTimeout(() => {
          setIsApproving(false);
        }, 2000);
      } catch (error) {
        console.error('Approval failed:', error);
        setIsApproving(false);
      }
      return;
    }

    // Step 4: Execute the main action
    setIsExecuting(true);
    try {
      await onExecute();
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
    <Button
      onClick={handleClick}
      disabled={disabled || loading}
      className={className}
    >
      {label}
    </Button>
  );
}