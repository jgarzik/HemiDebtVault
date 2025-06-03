import { useAccount, useWatchContractEvent, useReadContract, useWriteContract } from 'wagmi';
import { DEBT_VAULT_ABI } from '@/lib/contract';
import { DEBT_VAULT_ADDRESS } from '@/lib/hemi';
import { useToast } from '@/hooks/use-toast';
import { useRef } from 'react';
import { useState, useEffect } from 'react';
import type { CreditLine, Loan, PortfolioStats } from '@/types';

export function useDebtVault() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [portfolioStats, setPortfolioStats] = useState<PortfolioStats | null>(null);

  // Event watching disabled to avoid Hemi RPC filter errors
  // Toast notifications will be handled by transaction success states instead

  // Contract write hook
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  // Helper functions for contract interactions
  const deposit = async (token: string, amount: bigint) => {

    const hash = await writeContractAsync({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'deposit',
      args: [token as `0x${string}`, amount],
    });

    return hash;
  };

  const withdraw = async (token: string, amount: bigint) => {

    const hash = await writeContractAsync({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'withdraw',
      args: [token as `0x${string}`, amount],
    });

    return hash;
  };

  const borrow = async (lender: string, token: string, amount: bigint, maxAPR: bigint) => {
    const hash = await writeContractAsync({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'borrow',
      args: [lender as `0x${string}`, token as `0x${string}`, amount, maxAPR],
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

  const updateCreditLine = async (borrower: string, token: string, creditLimit: bigint, minAPR: bigint, maxAPR: bigint, originationFee: bigint) => {
    const hash = await writeContractAsync({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'updateCreditLine',
      args: [borrower as `0x${string}`, token as `0x${string}`, creditLimit, minAPR, maxAPR, originationFee],
    });
    return hash;
  };

  const forgivePrincipal = async (loanId: bigint, amount: bigint) => {
    const hash = await writeContractAsync({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'forgivePrincipal',
      args: [loanId, amount],
    });
    return hash;
  };

  const forgiveInterest = async (loanId: bigint) => {
    const hash = await writeContractAsync({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'forgiveInterest',
      args: [loanId],
    });
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

  // Get user's total loan count (lifetime)
  const getTotalUserLoans = (user: string) => {
    return useReadContract({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'totalUserLoans',
      args: [user as `0x${string}`],
    });
  };

  // Get loan max limit
  const getMaxLoansPerUser = () => {
    return useReadContract({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'MAX_LOANS_PER_USER',
    });
  };

  // Get outstanding balance for a loan
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

  // Get original borrower of a loan
  const getOriginalBorrower = (loanId: string) => {
    return useReadContract({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'originalBorrower',
      args: [BigInt(loanId)],
    });
  };

  return {
    // Contract writes
    deposit,
    withdraw,
    borrow,
    repay,
    updateCreditLine,
    forgivePrincipal,
    forgiveInterest,
    
    // Loading states
    isDepositLoading: isWritePending,
    isWithdrawLoading: isWritePending,
    isBorrowLoading: isWritePending,
    isRepayLoading: isWritePending,
    isUpdateCreditLoading: isWritePending,
    isForgiveLoading: isWritePending,
    
    // Read functions
    getLoanById,
    getCreditLine,
    getUserLoanCount,
    getTotalUserLoans,
    getMaxLoansPerUser,
    getOutstandingBalance,
    getAvailableCredit,
    getOriginalBorrower,
    
    // State
    portfolioStats,
    isConnected,
    address,
  };
}
