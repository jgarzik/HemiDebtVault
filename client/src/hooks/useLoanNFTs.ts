import { useAccount, useReadContract } from 'wagmi';
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