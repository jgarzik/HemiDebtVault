import { useAccount, usePublicClient, useWalletClient, useWriteContract } from 'wagmi';
import { useMemo, useState } from 'react';
import { getContract } from 'viem';
import { DEBT_VAULT_ADDRESS } from '@/lib/hemi';
import { DEBT_VAULT_ABI } from '@/lib/contract';
import { useQuerySuspension } from './useQuerySuspension';

/**
 * Enhanced transaction system following SushiSwap patterns
 * Separates gas estimation, transaction preparation, and execution
 */
export function useTransactionBuilder() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const [isExecuting, setIsExecuting] = useState(false);
  const { withSuspension } = useQuerySuspension();

  // Memoized contract instance for reads/simulations
  const contract = useMemo(() => {
    if (!publicClient) return null;
    
    return getContract({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      client: publicClient,
    });
  }, [publicClient]);

  const estimateGas = async (
    functionName: string,
    args: any[],
    overrides: any = {}
  ) => {
    if (!contract || !address || !isConnected) {
      throw new Error('Wallet not connected or contract not available');
    }

    try {
      console.log(`Estimating gas for ${functionName}...`);
      
      // Simulate the transaction to validate and get gas estimate
      const simulation = await contract.simulate[functionName as keyof typeof contract.simulate](
        args as any,
        {
          account: address,
          ...overrides,
        }
      );

      // Add 20% buffer to estimated gas to prevent out-of-gas errors
      const gasBuffer = BigInt(120);
      const baseGas = BigInt(200000); // Base gas estimate fallback
      const gasLimit = (baseGas * gasBuffer) / BigInt(100);

      console.log(`Gas estimation completed for ${functionName}`);

      return { gasLimit, simulation };
    } catch (error) {
      console.error(`Gas estimation failed for ${functionName}:`, error);
      // Return a safe default gas limit if estimation fails
      return { gasLimit: BigInt(300000), simulation: null };
    }
  };

  const executeTransaction = async (
    functionName: string,
    args: any[],
    overrides: any = {}
  ): Promise<string> => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    setIsExecuting(true);
    
    try {
      console.log(`Preparing transaction for ${functionName}...`);
      
      // Step 1: Estimate gas and validate transaction
      const { gasLimit } = await estimateGas(functionName, args, overrides);
      
      console.log(`Executing ${functionName} with gas limit:`, gasLimit.toString());
      
      // Step 2: Execute transaction with pre-calculated gas
      const hash = await writeContractAsync({
        address: DEBT_VAULT_ADDRESS,
        abi: DEBT_VAULT_ABI,
        functionName: functionName as any,
        args: args as any,
        gas: gasLimit,
        ...overrides,
      });

      console.log(`Transaction submitted successfully:`, hash);
      return hash;
    } catch (error) {
      console.error(`Transaction execution failed for ${functionName}:`, error);
      throw error;
    } finally {
      setIsExecuting(false);
    }
  };

  // Specific helper functions for each contract method
  const deposit = async (token: string, amount: bigint) => {
    return executeTransaction('deposit', [token, amount]);
  };

  const withdraw = async (token: string, amount: bigint) => {
    return executeTransaction('withdraw', [token, amount]);
  };

  const borrow = async (lender: string, token: string, amount: bigint, maxAPR: bigint) => {
    return executeTransaction('borrow', [lender, token, amount, maxAPR]);
  };

  const repay = async (loanId: bigint, amount: bigint) => {
    console.log('Starting repay transaction with enhanced gas estimation and query suspension...');
    
    return withSuspension(async () => {
      return executeTransaction('repay', [loanId, amount]);
    }, ['borrowerLoans', 'borrowerCreditLines', 'loanNFTs']);
  };

  const updateCreditLine = async (
    borrower: string, 
    token: string, 
    creditLimit: bigint, 
    minAPR: bigint, 
    maxAPR: bigint, 
    originationFee: bigint
  ) => {
    return executeTransaction('updateCreditLine', [
      borrower, token, creditLimit, minAPR, maxAPR, originationFee
    ]);
  };

  const forgivePrincipal = async (loanId: bigint, amount: bigint) => {
    return executeTransaction('forgivePrincipal', [loanId, amount]);
  };

  const forgiveInterest = async (loanId: bigint) => {
    return executeTransaction('forgiveInterest', [loanId]);
  };

  return {
    // Enhanced transaction methods
    deposit,
    withdraw,
    borrow,
    repay,
    updateCreditLine,
    forgivePrincipal,
    forgiveInterest,
    
    // Utilities
    estimateGas,
    executeTransaction,
    
    // State
    isExecuting,
    isReady: !!contract && isConnected,
    contract,
  };
}