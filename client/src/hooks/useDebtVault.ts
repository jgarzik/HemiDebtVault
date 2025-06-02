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

    const hash = await writeContractAsync({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'updateCreditLine',
      args: [borrower as `0x${string}`, token as `0x${string}`, creditLimit, minAPR, maxAPR],
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
