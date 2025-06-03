import { useAccount, usePublicClient } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { formatUnits } from 'viem';
import { DEBT_VAULT_ADDRESS } from '@/lib/hemi';
import { DEBT_VAULT_ABI } from '@/lib/contract';
import { getAllTokens, findTokenByAddress } from '@/lib/tokens';
import { QUERY_CACHE_CONFIG } from '@/lib/constants';
import { queryLoanCreatedEvents, queryRepaidEvents } from '@/lib/eventQueries';

interface Loan {
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
  outstandingBalance: bigint;
  formattedOutstandingBalance: string;
  interestRate: bigint;
  interestRatePercent: string;
  createdAt: bigint;
  createdAtDate: string;
  lastPayment: bigint;
  lastPaymentDate: string;
  isActive: boolean;
  accruedInterest: bigint;
  formattedAccruedInterest: string;
  totalInterestEarned: bigint;
  formattedTotalInterestEarned: string;
}

export function useLoans() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const tokens = getAllTokens();

  const fetchLoans = async (): Promise<Loan[]> => {
    if (!address || !publicClient) return [];

    try {
      // Use shared event querying system
      const loanEvents = await queryLoanCreatedEvents(publicClient, { lender: address });
      console.log('DEBUG: useLoans found loan events:', loanEvents.length);

      const loans: Loan[] = [];

      // Process each loan
      for (const event of loanEvents) {
        try {
          const { loanId, borrower, lender, token, amount, apr } = event.args;
          
          if (loanId === undefined || loanId === null || typeof loanId !== 'bigint') {
            continue;
          }
          
          // Get loan details from contract to check if still active
          const loanData = await publicClient.readContract({
            address: DEBT_VAULT_ADDRESS,
            abi: DEBT_VAULT_ABI,
            functionName: 'loanById',
            args: [loanId],
          });

          // The contract returns a struct with these fields:
          const [contractBorrower, contractLender, loanToken, loanPrincipal, repaidPrincipal, forgivenPrincipal, loanInterestRate, createdAtTimestamp, lastPaymentTimestamp, isClosed] = loanData as any;
          
          // Convert timestamps to bigint for compatibility
          const createdAt = BigInt(createdAtTimestamp);
          const lastPayment = BigInt(lastPaymentTimestamp);
          
          // Skip if loan is closed
          if (isClosed) {
            continue;
          }

          // Get token info
          const tokenInfo = findTokenByAddress(loanToken);
          if (!tokenInfo) {
            continue;
          }

          // Get outstanding balance using contract's getOutstandingBalance function
          const outstandingBalanceResult = await publicClient.readContract({
            address: DEBT_VAULT_ADDRESS,
            abi: DEBT_VAULT_ABI,
            functionName: 'getOutstandingBalance',
            args: [loanId],
          });
          const [contractOutstandingPrincipal, accruedInterest] = outstandingBalanceResult as readonly [bigint, bigint];
          const outstandingBalance = contractOutstandingPrincipal + accruedInterest;

          // Calculate total interest earned by aggregating repayment events
          let totalInterestEarned = BigInt(0);
          try {
            const repaymentEvents = await queryRepaidEvents(publicClient, { loanId });
            for (const repayEvent of repaymentEvents) {
              if (repayEvent.args?.interestPaid && typeof repayEvent.args.interestPaid === 'bigint') {
                totalInterestEarned += repayEvent.args.interestPaid;
              }
            }
          } catch (error) {
            console.error('Error fetching repayment events:', error);
          }

          const loan: Loan = {
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
            interestRate: loanInterestRate,
            interestRatePercent: (Number(loanInterestRate) / 100).toFixed(2),
            createdAt,
            createdAtDate: new Date(Number(createdAt) * 1000).toLocaleDateString(),
            lastPayment,
            lastPaymentDate: lastPayment > 0 ? new Date(Number(lastPayment) * 1000).toLocaleDateString() : 'No payments yet',
            isActive: true,
            accruedInterest,
            formattedAccruedInterest: formatUnits(accruedInterest, tokenInfo.decimals),
            outstandingPrincipal: contractOutstandingPrincipal,
            formattedOutstandingPrincipal: formatUnits(contractOutstandingPrincipal, tokenInfo.decimals),
            outstandingBalance,
            formattedOutstandingBalance: formatUnits(outstandingBalance, tokenInfo.decimals),
            totalInterestEarned,
            formattedTotalInterestEarned: formatUnits(totalInterestEarned, tokenInfo.decimals),
          };

          loans.push(loan);

        } catch (error) {
          console.error('Error processing loan:', error);
        }
      }

      return loans;
    } catch (error) {
      console.error('Error fetching loans:', error);
      return [];
    }
  };

  const { data: loans = [], isLoading, refetch } = useQuery({
    queryKey: ['loans', address],
    queryFn: fetchLoans,
    enabled: !!address && !!publicClient,
    staleTime: QUERY_CACHE_CONFIG.STALE_TIME,
    gcTime: QUERY_CACHE_CONFIG.GC_TIME,
    refetchOnWindowFocus: false,
  });

  return {
    loans,
    isLoading,
    refetch,
  };
}

export function useBorrowerLoans() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const tokens = getAllTokens();

  const fetchBorrowerLoans = async (): Promise<Loan[]> => {
    if (!address || !publicClient) return [];

    try {
      // Use shared event querying system for borrower loans
      const loanEvents = await queryLoanCreatedEvents(publicClient, { borrower: address });
      console.log('DEBUG: useBorrowerLoans found loan events:', loanEvents.length);

      const loans: Loan[] = [];

      // Process each loan (same logic as useLoans but for borrower)
      for (const event of loanEvents) {
        try {
          const { loanId } = event.args;
          
          if (loanId === undefined || loanId === null || typeof loanId !== 'bigint') {
            console.log('DEBUG: useBorrowerLoans skipping invalid loan ID:', loanId);
            continue;
          }
          
          console.log('DEBUG: useBorrowerLoans processing loan ID:', loanId.toString());
          
          // Get loan details from contract
          const loanData = await publicClient.readContract({
            address: DEBT_VAULT_ADDRESS,
            abi: DEBT_VAULT_ABI,
            functionName: 'loanById',
            args: [loanId],
          });

          const [contractBorrower, contractLender, loanToken, loanPrincipal, repaidPrincipal, forgivenPrincipal, loanInterestRate, createdAtTimestamp, lastPaymentTimestamp, isClosed] = loanData as any;
          
          console.log('DEBUG: useBorrowerLoans loan data:', {
            loanId: loanId.toString(),
            borrower: contractBorrower,
            lender: contractLender,
            token: loanToken,
            principal: loanPrincipal.toString(),
            closed: isClosed
          });
          
          // Convert timestamps to bigint for compatibility
          const createdAt = BigInt(createdAtTimestamp);
          const lastPayment = BigInt(lastPaymentTimestamp);
          
          // Skip if loan is closed
          if (isClosed) {
            console.log('DEBUG: useBorrowerLoans skipping closed loan:', loanId.toString());
            continue;
          }

          const tokenInfo = findTokenByAddress(loanToken);
          console.log('DEBUG: useBorrowerLoans token lookup:', loanToken, 'found:', !!tokenInfo);
          if (!tokenInfo) {
            console.log('DEBUG: useBorrowerLoans skipping loan - token not found:', loanToken);
            continue;
          }

          const outstandingBalanceResult = await publicClient.readContract({
            address: DEBT_VAULT_ADDRESS,
            abi: DEBT_VAULT_ABI,
            functionName: 'getOutstandingBalance',
            args: [loanId],
          });
          const [contractOutstandingPrincipal, accruedInterest] = outstandingBalanceResult as readonly [bigint, bigint];
          const outstandingBalance = contractOutstandingPrincipal + accruedInterest;

          const loan: Loan = {
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
            interestRate: loanInterestRate,
            interestRatePercent: (Number(loanInterestRate) / 100).toFixed(2),
            createdAt,
            createdAtDate: new Date(Number(createdAt) * 1000).toLocaleDateString(),
            lastPayment,
            lastPaymentDate: lastPayment > 0 ? new Date(Number(lastPayment) * 1000).toLocaleDateString() : 'No payments yet',
            isActive: true,
            accruedInterest,
            formattedAccruedInterest: formatUnits(accruedInterest, tokenInfo.decimals),
            outstandingPrincipal: contractOutstandingPrincipal,
            formattedOutstandingPrincipal: formatUnits(contractOutstandingPrincipal, tokenInfo.decimals),
            outstandingBalance,
            formattedOutstandingBalance: formatUnits(outstandingBalance, tokenInfo.decimals),
            totalInterestEarned: BigInt(0),
            formattedTotalInterestEarned: '0',
          };

          loans.push(loan);
          console.log('DEBUG: useBorrowerLoans successfully added loan:', loanId.toString());

        } catch (error) {
          console.error('Error processing borrower loan:', error);
        }
      }

      console.log('DEBUG: useBorrowerLoans returning', loans.length, 'loans');
      return loans;
    } catch (error) {
      console.error('Error fetching borrower loans:', error);
      return [];
    }
  };

  const { data: loans = [], isLoading, refetch } = useQuery({
    queryKey: ['borrowerLoans', address],
    queryFn: fetchBorrowerLoans,
    enabled: !!address && !!publicClient,
    staleTime: QUERY_CACHE_CONFIG.STALE_TIME,
    gcTime: QUERY_CACHE_CONFIG.GC_TIME,
    refetchOnWindowFocus: false,
  });

  return {
    loans,
    isLoading,
    refetch,
  };
}