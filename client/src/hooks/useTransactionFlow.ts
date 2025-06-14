/**
 * Transaction State Management System
 * 
 * This module orchestrates the complete transaction lifecycle from wallet connection
 * through execution, managing state transitions and user feedback throughout.
 * 
 * Key Features:
 * - Comprehensive transaction state machine with clear progression
 * - Automatic wallet connection and network validation
 * - Token approval detection and execution
 * - Error handling with user-friendly feedback
 * - Integration with toast notifications for status updates
 * 
 * Architecture:
 * - State-driven transaction flow with clear transitions
 * - Coordinates multiple hooks for wallet, network, and approval management
 * - Provides unified interface for all transaction types
 * - Handles edge cases and error recovery automatically
 */
import { useState, useEffect } from 'react';
import { useWalletConnection } from './useWalletConnection';
import { useNetworkSwitching } from './useNetworkSwitching';
import { useTokenApproval } from './useTokenApproval';
import { useTransactionExecution } from './useTransactionExecution';
import { useToast } from './use-toast';
import { Token } from '@/lib/tokens';

export type TransactionState = 
  | 'disconnected'
  | 'wrong_network' 
  | 'needs_approval'
  | 'ready_to_execute'
  | 'executing'
  | 'success'
  | 'error';

interface TransactionFlowParams {
  onExecute: () => Promise<string>;
  requiresApproval?: {
    token: Token;
    amount: string;
    spenderAddress: `0x${string}`;
  };
  actionLabel?: string;
  transactionAmount?: string;
  disabled?: boolean;
  onSuccess?: () => void;
  onBeforeConfirm?: () => void;
  onTransactionSent?: () => void;
}

export function useTransactionFlow({
  onExecute,
  requiresApproval,
  actionLabel,
  transactionAmount,
  disabled = false,
  onSuccess,
  onBeforeConfirm,
  onTransactionSent
}: TransactionFlowParams) {
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<any>(null);

  const wallet = useWalletConnection();
  const network = useNetworkSwitching();
  const approval = useTokenApproval(requiresApproval);
  const execution = useTransactionExecution();

  // Determine current state
  const getCurrentState = (): TransactionState => {
    if (disabled) return 'error';
    if (!wallet.isConnected) return 'disconnected';
    if (network.needsNetworkSwitch) return 'wrong_network';
    if (approval.needsApproval) return 'needs_approval';
    if (execution.isExecuting) return 'executing';
    return 'ready_to_execute';
  };

  const currentState = getCurrentState();

  // Get button label based on state
  const getButtonLabel = () => {
    switch (currentState) {
      case 'disconnected':
        return 'Connect Wallet';
      case 'wrong_network':
        return 'Switch to Hemi';
      case 'needs_approval':
        return approval.isApproving 
          ? `Approving ${requiresApproval?.token.symbol}...`
          : `Approve ${requiresApproval?.token.symbol}`;
      case 'executing':
        return 'Processing...';
      case 'ready_to_execute':
        return actionLabel || 'Execute Transaction';
      default:
        return actionLabel || 'Execute Transaction';
    }
  };

  const isLoading = approval.isApproving || execution.isExecuting;

  // Handle button click based on current state
  const handleClick = async () => {
    try {
      switch (currentState) {
        case 'disconnected':
          wallet.connect();
          break;
          
        case 'wrong_network':
          await network.switchToHemi();
          break;
          
        case 'needs_approval':
          setModalData({
            title: `Approve ${requiresApproval?.token.symbol}`,
            description: `Allow the contract to spend your ${requiresApproval?.token.symbol} tokens`,
            action: 'Approve',
            amount: requiresApproval ? `${requiresApproval.amount} ${requiresApproval.token.symbol}` : undefined,
            gasEstimate: '~$1.50',
          });
          setShowModal(true);
          break;
          
        case 'ready_to_execute':
          // Call onBeforeConfirm to allow parent modal to close first
          if (onBeforeConfirm) {
            onBeforeConfirm();
            // Small delay to allow parent modal to close before opening transaction modal
            await new Promise(resolve => setTimeout(resolve, 150));
          }
          
          setModalData({
            title: actionLabel || 'Execute Transaction',
            description: transactionAmount 
              ? `Confirm ${actionLabel?.toLowerCase() || 'transaction'} of ${transactionAmount}`
              : `Confirm your ${actionLabel?.toLowerCase() || 'transaction'}`,
            action: actionLabel || 'Execute',
            amount: transactionAmount,
            gasEstimate: '~$2.00',
          });
          setShowModal(true);
          break;
      }
    } catch (error) {
      console.error('Transaction flow error:', error);
    }
  };

  // Execute transaction or approval based on current state
  const handleConfirm = async () => {
    try {
      if (currentState === 'needs_approval') {
        await approval.approve();
        setShowModal(false);
      } else if (currentState === 'ready_to_execute') {
        await execution.execute(onExecute);
        setShowModal(false);
        // Call onTransactionSent immediately when transaction is sent to wallet
        onTransactionSent?.();
        // Success handling moved to useEffect when transaction is actually confirmed
      }
    } catch (error) {
      console.error('Transaction failed:', error);
      setShowModal(false);
      
      toast({
        title: `${actionLabel || 'Transaction'} Failed`,
        description: 'Transaction was rejected or failed. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Show success toast when transaction is confirmed
  useEffect(() => {
    console.log('useTransactionFlow - Transaction status:', { 
      isConfirmed: execution.isConfirmed, 
      txHash: execution.txHash,
      isExecuting: execution.isExecuting,
      bothConditionsMet: execution.isConfirmed && execution.txHash
    });
    
    // Trigger success when transaction is confirmed (txHash may be null due to state sync issues)
    if (execution.isConfirmed) {
      console.log('Transaction confirmed! Showing success toast');
      console.log('onSuccess callback exists:', !!onSuccess);
      
      toast({
        title: `${actionLabel || 'Transaction'} Successful`,
        description: transactionAmount 
          ? `Successfully processed ${transactionAmount}`
          : `${actionLabel || 'Transaction'} completed successfully`,
      });
      
      // Call success callback for data refresh
      if (onSuccess) {
        console.log('Calling onSuccess callback...');
        onSuccess();
      } else {
        console.log('No onSuccess callback provided');
      }
      
      // Trigger global data refresh event
      window.dispatchEvent(new CustomEvent('transactionSuccess', { 
        detail: { txHash: execution.txHash || 'confirmed', actionLabel } 
      }));
    }
  }, [execution.isConfirmed, execution.txHash, execution.isExecuting, toast, actionLabel, transactionAmount, onSuccess]);

  return {
    currentState,
    buttonLabel: getButtonLabel(),
    isLoading,
    isDisabled: disabled || isLoading,
    showModal,
    modalData,
    handleClick,
    handleConfirm,
    closeModal: () => setShowModal(false)
  };
}