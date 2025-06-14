import { useAccount } from 'wagmi';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useTransactionBuilder } from './useTransactionBuilder';
import { DEBT_VAULT_ADDRESS } from '@/lib/hemi';
import { DEBT_VAULT_ABI } from '@/lib/contract';
import { publicRpcClient } from '@/lib/rpcHelpers';
import type { PortfolioStats } from '@/types';

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

  // Direct RPC helper functions (no longer returning wagmi hooks)
  const getLoanById = async (loanId: string) => {
    return await publicRpcClient.readContract({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'loanById',
      args: [BigInt(loanId)],
    });
  };

  const getCreditLine = async (lender: string, borrower: string, token: string) => {
    return await publicRpcClient.readContract({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'creditLines',
      args: [lender as `0x${string}`, borrower as `0x${string}`, token as `0x${string}`],
    });
  };

  const getUserLoanCount = async (user: string) => {
    return await publicRpcClient.readContract({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'userLoanCount',
      args: [user as `0x${string}`],
    });
  };

  const getTotalUserLoans = async (user: string) => {
    return await publicRpcClient.readContract({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'totalUserLoans',
      args: [user as `0x${string}`],
    });
  };

  const getMaxLoansPerUser = async () => {
    return await publicRpcClient.readContract({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'MAX_LOANS_PER_USER',
    });
  };

  const getOutstandingBalance = async (loanId: string) => {
    return await publicRpcClient.readContract({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'getOutstandingBalance',
      args: [BigInt(loanId)],
    });
  };

  const getAvailableCredit = async (borrower: string, lender: string, token: string) => {
    return await publicRpcClient.readContract({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'getAvailableCredit',
      args: [borrower as `0x${string}`, lender as `0x${string}`, token as `0x${string}`],
    });
  };

  const getOriginalBorrower = async (loanId: string) => {
    return await publicRpcClient.readContract({
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
