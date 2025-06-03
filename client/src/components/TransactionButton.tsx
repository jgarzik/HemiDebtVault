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
  onSuccess
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
    onSuccess
  });

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={isDisabled}
        className={className}
      >
        {/* Use children for disabled states and ready_to_execute, otherwise use flow-specific labels */}
        {['disconnected', 'wrong_network', 'needs_approval', 'executing'].includes(modalData?.state) 
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