/**
 * Loan NFT Management System
 * 
 * This module fetches and manages loan NFT data for users, providing comprehensive
 * loan information including ownership, borrower status, and financial details.
 * 
 * Key Features:
 * - Direct RPC queries for loan NFT enumeration and metadata
 * - Real-time loan status and outstanding balance calculations
 * - Owner vs original borrower distinction for transferred loans
 * - Comprehensive loan data with formatted currency displays
 * - Efficient batch loading of loan portfolio data
 * 
 * Architecture:
 * - Uses direct RPC calls to prevent MetaMask conflicts during queries
 * - Provides helper functions for loan lookup and balance retrieval
 * - Handles loan transfers and ownership changes automatically
 * - Formats all monetary values for consistent UI display
 */
import { useAccount } from 'wagmi';
import { DEBT_VAULT_ABI } from '@/lib/contract';
import { DEBT_VAULT_ADDRESS } from '@/lib/hemi';
import { useState, useEffect } from 'react';
import { formatUnits } from 'viem';
import { findTokenByAddress } from '@/lib/tokens';
import { publicRpcClient } from '@/lib/rpcHelpers';

interface LoanNFT {
  loanId: bigint;
  borrower: string;
  lender: string;
  token: string;
  tokenSymbol: string;
  principal: bigint;
  formattedPrincipal: string;
  repaidPrincipal: bigint;
  formattedRepaidPrincipal: string;
  forgivenPrincipal: bigint;
  formattedForgivenPrincipal: string;
  outstandingPrincipal: bigint;
  formattedOutstandingPrincipal: string;
  apr: bigint;
  aprPercent: string;
  startTimestamp: bigint;
  lastPaymentTimestamp: bigint;
  closed: boolean;
  originalBorrower: string;
  isOwner: boolean;
  isOriginalBorrower: boolean;
}

export function useLoanNFTs() {
  const { address } = useAccount();
  const [loanNFTs, setLoanNFTs] = useState<LoanNFT[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Direct RPC helper functions
  const getTokenOfOwnerByIndex = async (ownerAddress: string, index: number) => {
    return await publicRpcClient.readContract({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'tokenOfOwnerByIndex',
      args: [ownerAddress as `0x${string}`, BigInt(index)],
    });
  };

  const getLoanDetails = async (loanId: bigint) => {
    return await publicRpcClient.readContract({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'loanById',
      args: [loanId],
    });
  };

  const getOriginalBorrower = async (loanId: bigint) => {
    return await publicRpcClient.readContract({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'originalBorrower',
      args: [loanId],
    });
  };

  const getOutstandingBalanceRpc = async (loanId: bigint) => {
    return await publicRpcClient.readContract({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'getOutstandingBalance',
      args: [loanId],
    });
  };

  const getUserBalance = async (userAddress: string) => {
    return await publicRpcClient.readContract({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'balanceOf',
      args: [userAddress as `0x${string}`],
    });
  };

  // Effect to fetch all loan NFTs when address changes
  useEffect(() => {
    if (!address) {
      setLoanNFTs([]);
      return;
    }

    setIsLoading(true);

    const fetchLoanNFTs = async () => {
      try {
        // Get user's NFT balance first
        const userBalance = await getUserBalance(address);

        if (!userBalance || userBalance === BigInt(0)) {
          setLoanNFTs([]);
          setIsLoading(false);
          return;
        }

        const loans: LoanNFT[] = [];
        
        for (let i = 0; i < Number(userBalance); i++) {
          try {
            // Get token ID at index
            const tokenId = await getTokenOfOwnerByIndex(address, i);

            // Get loan details
            const loanData = await getLoanDetails(tokenId as bigint);

            // Get original borrower
            const originalBorrowerAddress = await getOriginalBorrower(tokenId as bigint);

            // Get outstanding balance
            const outstandingBalanceData = await getOutstandingBalanceRpc(tokenId as bigint);

            if (Array.isArray(loanData) && loanData.length >= 8) {
              const [
                borrower,
                lender,
                token,
                principal,
                repaidPrincipal,
                forgivenPrincipal,
                apr,
                startTimestamp,
                lastPaymentTimestamp,
                closed
              ] = loanData;

              const tokenInfo = findTokenByAddress(token as string);
              const decimals = tokenInfo?.decimals || 18;

              const outstandingPrincipal = (principal as bigint) - 
                                         (repaidPrincipal as bigint) - 
                                         (forgivenPrincipal as bigint);

              const loanNFT: LoanNFT = {
                loanId: tokenId as bigint,
                borrower: borrower as string,
                lender: lender as string,
                token: token as string,
                tokenSymbol: tokenInfo?.symbol || 'Unknown',
                principal: principal as bigint,
                formattedPrincipal: formatUnits(principal as bigint, decimals),
                repaidPrincipal: repaidPrincipal as bigint,
                formattedRepaidPrincipal: formatUnits(repaidPrincipal as bigint, decimals),
                forgivenPrincipal: forgivenPrincipal as bigint,
                formattedForgivenPrincipal: formatUnits(forgivenPrincipal as bigint, decimals),
                outstandingPrincipal,
                formattedOutstandingPrincipal: formatUnits(outstandingPrincipal, decimals),
                apr: apr as bigint,
                aprPercent: ((Number(apr as bigint) / 100)).toString(),
                startTimestamp: startTimestamp as bigint,
                lastPaymentTimestamp: lastPaymentTimestamp as bigint,
                closed: closed as boolean,
                originalBorrower: originalBorrowerAddress as string,
                isOwner: true, // User owns the NFT
                isOriginalBorrower: (originalBorrowerAddress as string).toLowerCase() === address.toLowerCase(),
              };

              loans.push(loanNFT);
            }
          } catch (error) {
            console.error(`Error fetching loan NFT at index ${i}:`, error);
            continue;
          }
        }

        setLoanNFTs(loans);
      } catch (error) {
        console.error('Error fetching loan NFTs:', error);
        setLoanNFTs([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLoanNFTs();
  }, [address]);

  // Helper function to get loan by ID
  const getLoanById = (loanId: bigint) => {
    return loanNFTs.find(loan => loan.loanId === loanId);
  };

  // Helper function to get original borrower by loan ID
  const getOriginalBorrowerById = (loanId: bigint) => {
    const loan = getLoanById(loanId);
    return loan?.originalBorrower;
  };

  // Helper function to get outstanding balance by loan ID
  const getOutstandingBalanceById = (loanId: bigint) => {
    const loan = getLoanById(loanId);
    return loan?.outstandingPrincipal;
  };

  return {
    loanNFTs,
    isLoading,
    getLoanById,
    getOriginalBorrowerById,
    getOutstandingBalance: getOutstandingBalanceById,
    refetch: () => {
      if (address) {
        setIsLoading(true);
        // Trigger the effect by updating a dependency
      }
    }
  };
}