import { useAccount, useWatchContractEvent, useReadContract } from 'wagmi';
import { DEBT_VAULT_ABI } from '@/lib/contract';
import { DEBT_VAULT_ADDRESS } from '@/lib/hemi';
import { useToast } from '@/hooks/use-toast';
import { useRef } from 'react';
import { useState, useEffect } from 'react';
import { useTransactionBuilder } from './useTransactionBuilder';
import type { CreditLine, Loan, PortfolioStats } from '@/types';

export function useDebtVault() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [portfolioStats, setPortfolioStats] = useState<PortfolioStats | null>(null);
  const txBuilder = useTransactionBuilder();

  // Event watching disabled to avoid Hemi RPC filter errors
  // Toast notifications will be handled by transaction success states instead

  // Enhanced transaction methods using the transaction builder
  const deposit = async (token: string, amount: bigint) => {
    return txBuilder.deposit(token, amount);
  };

  const withdraw = async (token: string, amount: bigint) => {
    return txBuilder.withdraw(token, amount);
  };

  const borrow = async (lender: string, token: string, amount: bigint, maxAPR: bigint) => {
    return txBuilder.borrow(lender, token, amount, maxAPR);
  };

  const repay = async (loanId: bigint, amount: bigint) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    console.log('Executing enhanced repay transaction:', { 
      loanId: loanId.toString(), 
      amount: amount.toString() 
    });
    
    const hash = await txBuilder.repay(loanId, amount);
    
    console.log('Enhanced repay transaction hash:', hash);
    return hash;
  };

  const updateCreditLine = async (
    borrower: string, 
    token: string, 
    creditLimit: bigint, 
    minAPR: bigint, 
    maxAPR: bigint, 
    originationFee: bigint
  ) => {
    return txBuilder.updateCreditLine(borrower, token, creditLimit, minAPR, maxAPR, originationFee);
  };

  const forgivePrincipal = async (loanId: bigint, amount: bigint) => {
    return txBuilder.forgivePrincipal(loanId, amount);
  };

  const forgiveInterest = async (loanId: bigint) => {
    return txBuilder.forgiveInterest(loanId);
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
    isDepositLoading: txBuilder.isExecuting,
    isWithdrawLoading: txBuilder.isExecuting,
    isBorrowLoading: txBuilder.isExecuting,
    isRepayLoading: txBuilder.isExecuting,
    isUpdateCreditLoading: txBuilder.isExecuting,
    isForgiveLoading: txBuilder.isExecuting,
    
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
