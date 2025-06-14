/**
 * Universal Transaction Interface
 * 
 * This component provides a unified transaction interface that handles wallet connection,
 * network validation, token approvals, and transaction execution with comprehensive
 * error handling and user feedback.
 * 
 * Key Features:
 * - Automatic wallet connection and network switching
 * - Token approval detection and execution
 * - Transaction confirmation modals with detailed breakdowns
 * - Loading states and error handling
 * - Loan-specific confirmation flows with APR and terms display
 * 
 * Architecture:
 * - Uses useTransactionFlow for state management
 * - Integrates approval flows before transaction execution
 * - Provides context-aware confirmation modals
 * - Handles all transaction types through unified interface
 */
import { Button } from '@/components/ui/button';
import { useTransactionFlow } from '@/hooks/useTransactionFlow';
import { TransactionModal } from './TransactionModal';
import { LoanConfirmationModal } from './LoanConfirmationModal';
import { Token } from '@/lib/tokens';

interface TransactionButtonProps {
  children: React.ReactNode;
  onExecute: () => Promise<string>;
  className?: string;
  disabled?: boolean;
  requiresApproval?: {
    token: Token;
    amount: string;
    spenderAddress: `0x${string}`;
  };
  actionLabel?: string;
  transactionAmount?: string;
  loanDetails?: {
    lender: string;
    token: string;
    principal: string;
    apr: string;
    utilization: string;
    dailyInterest: string;
  };
  onSuccess?: () => void;
  onBeforeConfirm?: () => void;
}

export function TransactionButton({ 
  children, 
  onExecute, 
  className = '', 
  disabled = false,
  requiresApproval,
  actionLabel,
  transactionAmount,
  loanDetails,
  onSuccess,
  onBeforeConfirm
}: TransactionButtonProps) {
  const {
    buttonLabel,
    isLoading,
    isDisabled,
    showModal,
    modalData,
    handleClick,
    handleConfirm,
    closeModal,
    currentState
  } = useTransactionFlow({
    onExecute,
    requiresApproval,
    actionLabel,
    transactionAmount,
    disabled,
    onSuccess,
    onBeforeConfirm
  });

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={isDisabled}
        className={className}
      >
        {/* Use children for disabled/ready states, buttonLabel for wallet/network/approval states */}
        {['disconnected', 'wrong_network', 'needs_approval', 'executing'].includes(currentState) 
          ? buttonLabel 
          : children}
      </Button>

      {loanDetails ? (
        <LoanConfirmationModal
          isOpen={showModal}
          onClose={closeModal}
          onConfirm={handleConfirm}
          loanDetails={loanDetails}
          isLoading={isLoading}
        />
      ) : (
        <TransactionModal
          isOpen={showModal}
          onClose={closeModal}
          onConfirm={handleConfirm}
          title={modalData?.title || ''}
          description={modalData?.description || ''}
          action={modalData?.action || ''}
          amount={modalData?.amount}
          gasEstimate={modalData?.gasEstimate}
          isLoading={isLoading}
        />
      )}
    </>
  );
}