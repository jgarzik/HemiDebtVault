import { Button } from '@/components/ui/button';
import { useTransactionFlow } from '@/hooks/useTransactionFlow';
import { TransactionModal } from './TransactionModal';
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
}

export function TransactionButton({ 
  children, 
  onExecute, 
  className = '', 
  disabled = false,
  requiresApproval,
  actionLabel,
  transactionAmount,
  loanDetails
}: TransactionButtonProps) {
  const {
    buttonLabel,
    isLoading,
    isDisabled,
    showModal,
    modalData,
    handleClick,
    handleConfirm,
    closeModal
  } = useTransactionFlow({
    onExecute,
    requiresApproval,
    actionLabel,
    transactionAmount,
    disabled
  });

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={isDisabled}
        className={className}
      >
        {buttonLabel}
      </Button>

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
        loanDetails={loanDetails}
      />
    </>
  );
}