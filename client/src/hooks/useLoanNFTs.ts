import { useAccount, usePublicClient } from 'wagmi';
import { DEBT_VAULT_ABI } from '@/lib/contract';
import { DEBT_VAULT_ADDRESS } from '@/lib/hemi';
import { useState, useEffect } from 'react';
import { formatUnits } from 'viem';
import { findTokenByAddress } from '@/lib/tokens';
import { queryLoanCreatedEvents } from '@/lib/eventQueries';
import { useQuery } from '@tanstack/react-query';
import { QUERY_CACHE_CONFIG } from '@/lib/constants';

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

  // Fetch loan NFTs using event-based approach (same as useBorrowerLoans)
  const fetchLoanNFTs = async (): Promise<LoanNFT[]> => {
    if (!address || !publicClient) {
      console.log('DEBUG: No address or publicClient for useLoanNFTs');
      return [];
    }

    try {
      console.log('DEBUG: useLoanNFTs querying for borrower:', address);
      
      // Query LoanCreated events for this borrower
      const loanEvents = await queryLoanCreatedEvents(publicClient, { borrower: address });
      console.log('DEBUG: useLoanNFTs found loan events:', loanEvents.length);

      const loanNFTs: LoanNFT[] = [];

      // Process each loan (same logic as useBorrowerLoans)
      for (const event of loanEvents) {
        try {
          const { loanId } = event.args;
          
          if (!loanId || typeof loanId !== 'bigint') {
            continue;
          }
          
          // Get loan details from contract
          const loanData = await publicClient.readContract({
            address: DEBT_VAULT_ADDRESS,
            abi: DEBT_VAULT_ABI,
            functionName: 'loanById',
            args: [loanId],
          });

          const [contractBorrower, contractLender, loanToken, loanPrincipal, repaidPrincipal, forgivenPrincipal, loanInterestRate, createdAtTimestamp, lastPaymentTimestamp, isClosed] = loanData as any;
          
          // Convert timestamps to bigint for compatibility
          const createdAt = BigInt(createdAtTimestamp);
          const lastPayment = BigInt(lastPaymentTimestamp);
          
          // Skip if loan is closed
          if (isClosed) {
            continue;
          }

          const tokenInfo = findTokenByAddress(loanToken);
          if (!tokenInfo) {
            continue;
          }

          // Get current NFT owner
          const currentOwner = await publicClient.readContract({
            address: DEBT_VAULT_ADDRESS,
            abi: DEBT_VAULT_ABI,
            functionName: 'ownerOf',
            args: [loanId],
          });

          // Get original borrower
          const originalBorrower = await publicClient.readContract({
            address: DEBT_VAULT_ADDRESS,
            abi: DEBT_VAULT_ABI,
            functionName: 'originalBorrower',
            args: [loanId],
          });

          const outstandingPrincipal = loanPrincipal - repaidPrincipal - forgivenPrincipal;

          const loanNFT: LoanNFT = {
            loanId,
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
            startTimestamp: createdAt,
            lastPaymentTimestamp: lastPayment,
            closed: isClosed,
            originalBorrower: originalBorrower as string,
            isOwner: currentOwner === address,
            isOriginalBorrower: originalBorrower === address,
          };

          loanNFTs.push(loanNFT);

        } catch (error) {
          console.error('Error processing loan NFT:', error);
        }
      }

      return loanNFTs;
    } catch (error) {
      console.error('Error fetching loan NFTs:', error);
      return [];
    }
  };

  const { data: loanNFTs = [], isLoading, refetch } = useQuery({
    queryKey: ['loanNFTs', address],
    queryFn: fetchLoanNFTs,
    enabled: !!address && !!publicClient,
    staleTime: QUERY_CACHE_CONFIG.STALE_TIME,
    gcTime: QUERY_CACHE_CONFIG.GC_TIME,
    refetchOnWindowFocus: false,
  });

  const getLoanById = (loanId: bigint) => {
    return loanNFTs.find(loan => loan.loanId === loanId);
  };

  const getOriginalBorrower = (loanId: bigint) => {
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
    refetch,
    getLoanById,
    getOriginalBorrower,
    getOutstandingBalance,
  };
}
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'tokenOfOwnerByIndex',
      args: address ? [address, BigInt(index)] : undefined,
      query: {
        enabled: !!address && index >= 0,
      },
    });
  };

  // Function to get loan details by ID
  const getLoanById = (loanId: bigint) => {
    return useReadContract({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'loanById',
      args: [loanId],
    });
  };

  // Function to get original borrower
  const getOriginalBorrower = (loanId: bigint) => {
    return useReadContract({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'originalBorrower',
      args: [loanId],
    });
  };

  // Function to get outstanding balance
  const getOutstandingBalance = (loanId: bigint) => {
    return useReadContract({
      address: DEBT_VAULT_ADDRESS,
      abi: DEBT_VAULT_ABI,
      functionName: 'getOutstandingBalance',
      args: [loanId],
    });
  };

  useEffect(() => {
    if (!address || !balance || balance === BigInt(0)) {
      setLoanNFTs([]);
      return;
    }

    const fetchLoanNFTs = async () => {
      setIsLoading(true);
      const loans: LoanNFT[] = [];

      try {
        // Get all token IDs owned by the user
        for (let i = 0; i < Number(balance); i++) {
          // Get token ID at index
          const tokenIdResult = await fetch(`/api/contract/tokenOfOwnerByIndex?owner=${address}&index=${i}`);
          if (!tokenIdResult.ok) continue;
          
          const { tokenId } = await tokenIdResult.json();
          if (!tokenId) continue;

          // Get loan details
          const loanResult = await fetch(`/api/contract/loanById?loanId=${tokenId}`);
          if (!loanResult.ok) continue;

          const loanData = await loanResult.json();
          if (!loanData) continue;

          // Get original borrower
          const originalBorrowerResult = await fetch(`/api/contract/originalBorrower?loanId=${tokenId}`);
          const originalBorrowerData = originalBorrowerResult.ok ? await originalBorrowerResult.json() : null;

          // Get outstanding balance
          const outstandingResult = await fetch(`/api/contract/getOutstandingBalance?loanId=${tokenId}`);
          const outstandingData = outstandingResult.ok ? await outstandingResult.json() : null;

          const token = findTokenByAddress(loanData.token);
          const decimals = token?.decimals || 18;
          
          const outstandingPrincipal = outstandingData 
            ? BigInt(loanData.principal) - BigInt(loanData.repaidPrincipal) - BigInt(loanData.forgivenPrincipal)
            : BigInt(loanData.principal) - BigInt(loanData.repaidPrincipal) - BigInt(loanData.forgivenPrincipal);

          const loanNFT: LoanNFT = {
            loanId: BigInt(tokenId),
            borrower: loanData.borrower,
            lender: loanData.lender,
            token: loanData.token,
            tokenSymbol: token?.symbol || 'UNKNOWN',
            principal: BigInt(loanData.principal),
            formattedPrincipal: formatUnits(BigInt(loanData.principal), decimals),
            repaidPrincipal: BigInt(loanData.repaidPrincipal),
            formattedRepaidPrincipal: formatUnits(BigInt(loanData.repaidPrincipal), decimals),
            forgivenPrincipal: BigInt(loanData.forgivenPrincipal),
            formattedForgivenPrincipal: formatUnits(BigInt(loanData.forgivenPrincipal), decimals),
            outstandingPrincipal,
            formattedOutstandingPrincipal: formatUnits(outstandingPrincipal, decimals),
            apr: BigInt(loanData.apr),
            aprPercent: (Number(loanData.apr) / 100).toFixed(2),
            startTimestamp: BigInt(loanData.startTimestamp),
            lastPaymentTimestamp: BigInt(loanData.lastPaymentTimestamp),
            closed: loanData.closed,
            originalBorrower: originalBorrowerData?.originalBorrower || loanData.borrower,
            isOwner: true, // User owns this NFT
            isOriginalBorrower: originalBorrowerData?.originalBorrower?.toLowerCase() === address.toLowerCase(),
          };

          loans.push(loanNFT);
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
  }, [address, balance]);

  return {
    loanNFTs,
    isLoading,
    balance: balance || BigInt(0),
    refetch: () => {
      // Trigger a re-fetch by updating a dependency
      if (address && balance) {
        setIsLoading(true);
        // Re-run the effect
        setTimeout(() => setIsLoading(false), 100);
      }
    },
  };
}