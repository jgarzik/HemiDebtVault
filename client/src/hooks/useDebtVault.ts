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
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  // Helper functions for contract interactions
  const deposit = async (token: string, amount: bigint) => {
    console.log('Depositing:', { token, amount });
    const hash = await writeContractAsync({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'deposit',
      args: [token as `0x${string}`, amount],
    });
    console.log('Deposit transaction hash:', hash);
    return hash;
  };

  const withdraw = async (token: string, amount: bigint) => {
    console.log('Withdrawing:', { token, amount });
    const hash = await writeContractAsync({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'withdraw',
      args: [token as `0x${string}`, amount],
    });
    console.log('Withdraw transaction hash:', hash);
    return hash;
  };

  const borrow = async (lender: string, token: string, amount: bigint) => {
    const hash = await writeContractAsync({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'borrow',
      args: [lender as `0x${string}`, token as `0x${string}`, amount],
    });
    return hash;
  };

  const repay = async (loanId: bigint, amount: bigint) => {
    const hash = await writeContractAsync({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'repay',
      args: [loanId, amount],
    });
    return hash;
  };

  const updateCreditLine = async (borrower: string, token: string, creditLimit: bigint, minAPR: bigint, maxAPR: bigint) => {
    console.log('Creating credit line:', { borrower, token, creditLimit, minAPR, maxAPR });
    const hash = await writeContractAsync({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'updateCreditLine',
      args: [borrower as `0x${string}`, token as `0x${string}`, creditLimit, minAPR, maxAPR],
    });
    console.log('Credit line transaction hash:', hash);
    return hash;
  };

  // Get loan details by ID
  const getLoanById = (loanId: string) => {
    return useReadContract({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'loanById',
      args: [BigInt(loanId)],
    });
  };

  // Get credit line configuration
  const getCreditLine = (lender: string, borrower: string, token: string) => {
    return useReadContract({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'creditLines',
      args: [lender as `0x${string}`, borrower as `0x${string}`, token as `0x${string}`],
    });
  };

  // Get user's loan count
  const getUserLoanCount = (user: string) => {
    return useReadContract({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'userLoanCount',
      args: [user as `0x${string}`],
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
    getLoanById,
    getCreditLine,
    getUserLoanCount,
    
    // State
    portfolioStats,
    isConnected,
    address,
  };
}
