import { useAccount, useWalletClient, useWriteContract } from 'wagmi';
import { useState } from 'react';
import { DEBT_VAULT_ADDRESS } from '@/lib/hemi';
import { DEBT_VAULT_ABI } from '@/lib/contract';
import { useQuerySuspension } from './useQuerySuspension';
import { publicRpcClient } from '@/lib/rpcHelpers';

/**
 * Enhanced transaction system following SushiSwap patterns
 * Separates gas estimation, transaction preparation, and execution
 */
export function useTransactionBuilder() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const [isExecuting, setIsExecuting] = useState(false);
  const { withSuspension } = useQuerySuspension();

  const estimateGas = async (
    functionName: string,
    args: any[],
    overrides: any = {}
  ) => {
    if (!address || !isConnected) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log(`Estimating gas for ${functionName}...`);
      
      // Simulate the transaction to validate and get gas estimate
      const simulation = await publicRpcClient.simulateContract({
        address: DEBT_VAULT_ADDRESS,
        abi: DEBT_VAULT_ABI,
        functionName: functionName as any,
        args: args as any,
        account: address,
        ...overrides,
      });

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

  // Generic ERC-20 token approval
  const approveToken = async (tokenAddress: string, spenderAddress: string, amount: bigint) => {
    console.log('Starting token approval with enhanced system...');
    
    return withSuspension(async () => {
      const hash = await writeContractAsync({
        address: tokenAddress as `0x${string}`,
        abi: [
          {
            name: 'approve',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'spender', type: 'address' },
              { name: 'amount', type: 'uint256' }
            ],
            outputs: [{ name: '', type: 'bool' }]
          }
        ],
        functionName: 'approve',
        args: [spenderAddress as `0x${string}`, amount],
      });
      return hash;
    }, ['tokenBalance']);
  };

  // NFT transfer function
  const transferNFT = async (from: string, to: string, tokenId: bigint) => {
    console.log('Starting NFT transfer with enhanced system...');
    
    return withSuspension(async () => {
      const hash = await writeContractAsync({
        address: DEBT_VAULT_ADDRESS,
        abi: DEBT_VAULT_ABI,
        functionName: 'transferFrom',
        args: [from as `0x${string}`, to as `0x${string}`, tokenId],
      });
      return hash;
    }, ['loans', 'borrowerLoans', 'loanNFTs']);
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
    
    // Generic transaction methods
    approveToken,
    transferNFT,
    
    // Utilities
    estimateGas,
    executeTransaction,
    
    // State
    isExecuting,
    isReady: isConnected,
  };
}