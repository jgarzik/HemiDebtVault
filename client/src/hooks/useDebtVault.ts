import { useAccount, useWatchContractEvent, useReadContract, useWriteContract } from 'wagmi';
import { DEBT_VAULT_ABI } from '@/lib/contract';
import { DEBT_VAULT_ADDRESS } from '@/lib/hemi';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import type { CreditLine, Loan, PortfolioStats } from '@/types';

export function useDebtVault() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [portfolioStats, setPortfolioStats] = useState<PortfolioStats | null>(null);

  // Listen to contract events
  useWatchContractEvent({
    address: DEBT_VAULT_ADDRESS,
    abi: DEBT_VAULT_ABI,
    eventName: 'LoanCreated',
    onLogs(logs) {
      toast({
        title: "Loan Created",
        description: `New loan created successfully`,
      });
    },
  });

  useWatchContractEvent({
    address: DEBT_VAULT_ADDRESS,
    abi: DEBT_VAULT_ABI,
    eventName: 'LoanRepaid',
    onLogs(logs) {
      toast({
        title: "Payment Received",
        description: `Loan payment processed`,
      });
    },
  });

  useWatchContractEvent({
    address: DEBT_VAULT_ADDRESS,
    abi: DEBT_VAULT_ABI,
    eventName: 'CreditLineUpdated',
    onLogs(logs) {
      toast({
        title: "Credit Line Updated",
        description: `Credit line has been modified`,
      });
    },
  });

  // Contract write hook
  const { writeContract, isPending: isWritePending } = useWriteContract();

  // Helper functions for contract interactions
  const deposit = (token: string, amount: bigint) => {
    writeContract({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'deposit',
      args: [token, amount],
    });
  };

  const withdraw = (token: string, amount: bigint) => {
    writeContract({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'withdraw',
      args: [token, amount],
    });
  };

  const borrow = (lender: string, token: string, amount: bigint) => {
    writeContract({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'borrow',
      args: [lender, token, amount],
    });
  };

  const repay = (loanId: bigint, amount: bigint) => {
    writeContract({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'repay',
      args: [loanId, amount],
    });
  };

  const updateCreditLine = (borrower: string, token: string, creditLimit: bigint, minAPR: bigint, maxAPR: bigint) => {
    writeContract({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'updateCreditLine',
      args: [borrower, token, creditLimit, minAPR, maxAPR],
    });
  };

  // Get outstanding balance
  const getOutstandingBalance = (loanId: string) => {
    return useReadContract({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'getOutstandingBalance',
      args: [BigInt(loanId)],
    });
  };

  // Get available credit
  const getAvailableCredit = (borrower: string, lender: string, token: string) => {
    return useReadContract({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'getAvailableCredit',
      args: [borrower as `0x${string}`, lender as `0x${string}`, token as `0x${string}`],
    });
  };

  return {
    // Contract writes
    deposit,
    withdraw,
    borrow,
    repay,
    updateCreditLine,
    
    // Loading states
    isDepositLoading: isWritePending,
    isWithdrawLoading: isWritePending,
    isBorrowLoading: isWritePending,
    isRepayLoading: isWritePending,
    isUpdateCreditLoading: isWritePending,
    
    // Read functions
    getOutstandingBalance,
    getAvailableCredit,
    
    // State
    portfolioStats,
    isConnected,
    address,
  };
}
