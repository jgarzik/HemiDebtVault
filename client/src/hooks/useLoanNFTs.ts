import { useAccount, useReadContract, usePublicClient } from 'wagmi';
import { DEBT_VAULT_ABI } from '@/lib/contract';
import { DEBT_VAULT_ADDRESS } from '@/lib/hemi';
import { useState, useEffect } from 'react';
import { formatUnits } from 'viem';
import { findTokenByAddress } from '@/lib/tokens';

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
  const publicClient = usePublicClient();
  const [loanNFTs, setLoanNFTs] = useState<LoanNFT[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Get user's NFT balance
  const { data: balance } = useReadContract({
    address: DEBT_VAULT_ADDRESS,
    abi: DEBT_VAULT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Function to get token ID by index for the user
  const getTokenOfOwnerByIndex = (index: number) => {
    return useReadContract({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'tokenOfOwnerByIndex',
      args: address ? [address, BigInt(index)] : undefined,
      query: {
        enabled: !!address && index >= 0,
      },
    });
  };

  // Function to get loan details by loan ID
  const getLoanDetails = (loanId: bigint) => {
    return useReadContract({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'loanById',
      args: [loanId],
      query: {
        enabled: !!loanId,
      },
    });
  };

  // Function to get original borrower
  const getOriginalBorrower = (loanId: bigint) => {
    return useReadContract({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'originalBorrower',
      args: [loanId],
      query: {
        enabled: !!loanId,
      },
    });
  };

  // Effect to fetch all loan NFTs when balance changes
  useEffect(() => {
    if (!address || !balance || balance === 0n || !publicClient) {
      setLoanNFTs([]);
      return;
    }

    setIsLoading(true);

    const fetchLoanNFTs = async () => {
      try {
        const loans: LoanNFT[] = [];
        
        for (let i = 0; i < Number(balance); i++) {
          try {
            // Get token ID at index
            const tokenId = await publicClient.readContract({
              address: DEBT_VAULT_ADDRESS,
              abi: DEBT_VAULT_ABI,
              functionName: 'tokenOfOwnerByIndex',
              args: [address, BigInt(i)],
            });

            // Get loan details
            const loanData = await publicClient.readContract({
              address: DEBT_VAULT_ADDRESS,
              abi: DEBT_VAULT_ABI,
              functionName: 'loanById',
              args: [tokenId],
            });

            const [contractBorrower, contractLender, loanToken, loanPrincipal, repaidPrincipal, forgivenPrincipal, loanInterestRate, createdAtTimestamp, lastPaymentTimestamp, isClosed] = loanData as any;

            // Skip if loan is closed
            if (isClosed) {
              continue;
            }

            const tokenInfo = findTokenByAddress(loanToken);
            if (!tokenInfo) {
              continue;
            }

            // Get original borrower
            const originalBorrower = await publicClient.readContract({
              address: DEBT_VAULT_ADDRESS,
              abi: DEBT_VAULT_ABI,
              functionName: 'originalBorrower',
              args: [tokenId],
            });

            const outstandingPrincipal = loanPrincipal - repaidPrincipal - forgivenPrincipal;

            const loanNFT: LoanNFT = {
              loanId: tokenId,
              borrower: contractBorrower,
              lender: contractLender,
              token: loanToken,
              tokenSymbol: tokenInfo.symbol,
              principal: loanPrincipal,
              formattedPrincipal: formatUnits(loanPrincipal, tokenInfo.decimals),
              repaidPrincipal,
              formattedRepaidPrincipal: formatUnits(repaidPrincipal, tokenInfo.decimals),
              forgivenPrincipal,
              formattedForgivenPrincipal: formatUnits(forgivenPrincipal, tokenInfo.decimals),
              outstandingPrincipal,
              formattedOutstandingPrincipal: formatUnits(outstandingPrincipal, tokenInfo.decimals),
              apr: loanInterestRate,
              aprPercent: (Number(loanInterestRate) / 100).toFixed(2),
              startTimestamp: BigInt(createdAtTimestamp),
              lastPaymentTimestamp: BigInt(lastPaymentTimestamp),
              closed: isClosed,
              originalBorrower: originalBorrower as string,
              isOwner: true, // User owns the NFT if we found it in their balance
              isOriginalBorrower: (originalBorrower as string).toLowerCase() === address.toLowerCase(),
            };

            loans.push(loanNFT);
          } catch (error) {
            console.error(`Error fetching loan NFT at index ${i}:`, error);
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
  }, [address, balance, publicClient]);

  const getLoanById = (loanId: bigint) => {
    return loanNFTs.find(loan => loan.loanId === loanId);
  };

  const getOriginalBorrowerById = (loanId: bigint) => {
    const loan = getLoanById(loanId);
    return loan?.originalBorrower;
  };

  const getOutstandingBalance = (loanId: bigint) => {
    const loan = getLoanById(loanId);
    return loan ? loan.outstandingPrincipal : BigInt(0);
  };

  return {
    loanNFTs,
    isLoading,
    refetch: () => {
      if (address && balance && balance > 0n && publicClient) {
        setIsLoading(true);
        // The useEffect will handle the refetch when isLoading changes
      }
    },
    getLoanById,
    getOriginalBorrower: getOriginalBorrowerById,
    getOutstandingBalance,
  };
}