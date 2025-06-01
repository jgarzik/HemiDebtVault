import { useAccount, useContractEvent, useContractRead, useContractWrite, usePrepareContractWrite } from 'wagmi';
import { DEBT_VAULT_ABI, DEBT_VAULT_ADDRESS } from '@/lib/contract';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import type { CreditLine, Loan, PortfolioStats } from '@/types';

export function useDebtVault() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [portfolioStats, setPortfolioStats] = useState<PortfolioStats | null>(null);

  // Listen to contract events
  useContractEvent({
    address: DEBT_VAULT_ADDRESS,
    abi: DEBT_VAULT_ABI,
    eventName: 'LoanCreated',
    listener(logs) {
      toast({
        title: "Loan Created",
        description: `New loan created successfully`,
      });
    },
  });

  useContractEvent({
    address: DEBT_VAULT_ADDRESS,
    abi: DEBT_VAULT_ABI,
    eventName: 'LoanRepaid',
    listener(logs) {
      toast({
        title: "Payment Received",
        description: `Loan payment processed`,
      });
    },
  });

  useContractEvent({
    address: DEBT_VAULT_ADDRESS,
    abi: DEBT_VAULT_ABI,
    eventName: 'CreditLineUpdated',
    listener(logs) {
      toast({
        title: "Credit Line Updated",
        description: `Credit line has been modified`,
      });
    },
  });

  // Deposit function
  const { config: depositConfig } = usePrepareContractWrite({
    address: DEBT_VAULT_ADDRESS,
    abi: DEBT_VAULT_ABI,
    functionName: 'deposit',
  });
  const depositWrite = useContractWrite(depositConfig);

  // Withdraw function
  const { config: withdrawConfig } = usePrepareContractWrite({
    address: DEBT_VAULT_ADDRESS,
    abi: DEBT_VAULT_ABI,
    functionName: 'withdraw',
  });
  const withdrawWrite = useContractWrite(withdrawConfig);

  // Borrow function
  const { config: borrowConfig } = usePrepareContractWrite({
    address: DEBT_VAULT_ADDRESS,
    abi: DEBT_VAULT_ABI,
    functionName: 'borrow',
  });
  const borrowWrite = useContractWrite(borrowConfig);

  // Repay function
  const { config: repayConfig } = usePrepareContractWrite({
    address: DEBT_VAULT_ADDRESS,
    abi: DEBT_VAULT_ABI,
    functionName: 'repay',
  });
  const repayWrite = useContractWrite(repayConfig);

  // Update credit line function
  const { config: updateCreditConfig } = usePrepareContractWrite({
    address: DEBT_VAULT_ADDRESS,
    abi: DEBT_VAULT_ABI,
    functionName: 'updateCreditLine',
  });
  const updateCreditWrite = useContractWrite(updateCreditConfig);

  // Get outstanding balance
  const getOutstandingBalance = (loanId: string) => {
    return useContractRead({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'getOutstandingBalance',
      args: [BigInt(loanId)],
      enabled: !!loanId,
    });
  };

  // Get available credit
  const getAvailableCredit = (borrower: string, lender: string, token: string) => {
    return useContractRead({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'getAvailableCredit',
      args: [borrower, lender, token],
      enabled: !!borrower && !!lender && !!token,
    });
  };

  return {
    // Contract writes
    deposit: depositWrite.write,
    withdraw: withdrawWrite.write,
    borrow: borrowWrite.write,
    repay: repayWrite.write,
    updateCreditLine: updateCreditWrite.write,
    
    // Loading states
    isDepositLoading: depositWrite.isLoading,
    isWithdrawLoading: withdrawWrite.isLoading,
    isBorrowLoading: borrowWrite.isLoading,
    isRepayLoading: repayWrite.isLoading,
    isUpdateCreditLoading: updateCreditWrite.isLoading,
    
    // Read functions
    getOutstandingBalance,
    getAvailableCredit,
    
    // State
    portfolioStats,
    isConnected,
    address,
  };
}
