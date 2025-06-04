import { useAccount, usePublicClient } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { formatUnits } from 'viem';
import { DEBT_VAULT_ADDRESS, DEBT_VAULT_DEPLOYMENT_BLOCK } from '@/lib/hemi';
import { DEBT_VAULT_ABI } from '@/lib/contract';
import { getAllTokens, findTokenByAddress } from '@/lib/tokens';
import { QUERY_CACHE_CONFIG } from '@/lib/constants';
import { queryLoanCreatedEvents, queryRepaidEvents } from '@/lib/eventQueries';
import { isValidLoanId, processLoanFromEvent } from '@/lib/loanHelpers';

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
      // Use shared event querying system starting from deployment block
      const loanEvents = await queryLoanCreatedEvents(publicClient, { lender: address }, { fromBlock: DEBT_VAULT_DEPLOYMENT_BLOCK });
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
      // Use shared event querying system for borrower loans starting from deployment block
      const loanEvents = await queryLoanCreatedEvents(publicClient, { borrower: address }, { fromBlock: DEBT_VAULT_DEPLOYMENT_BLOCK });
      console.log('DEBUG: useBorrowerLoans found loan events:', loanEvents.length);

      const loans: Loan[] = [];

      // Process each loan using consolidated helper function
      for (const event of loanEvents) {
        try {
          const { loanId } = event.args;
          
          if (!isValidLoanId(loanId)) {
            console.log('DEBUG: useBorrowerLoans skipping invalid loan ID:', loanId);
            continue;
          }
          
          // Use helper function to process loan data
          const processedLoan = await processLoanFromEvent(publicClient, loanId, address);
          
          if (processedLoan) {
            // Convert ProcessedLoanData to Loan interface
            const loan: Loan = {
              loanId: processedLoan.loanId,
              borrower: processedLoan.borrower,
              lender: processedLoan.lender,
              token: processedLoan.token,
              tokenSymbol: processedLoan.tokenSymbol,
              principal: processedLoan.principal,
              formattedPrincipal: processedLoan.formattedPrincipal,
              repaidPrincipal: processedLoan.repaidPrincipal,
              formattedRepaidPrincipal: processedLoan.formattedRepaidPrincipal,
              forgivenPrincipal: processedLoan.forgivenPrincipal,
              formattedForgivenPrincipal: processedLoan.formattedForgivenPrincipal,
              interestRate: processedLoan.interestRate,
              interestRatePercent: processedLoan.interestRatePercent,
              createdAt: processedLoan.createdAt,
              createdAtDate: processedLoan.createdAtDate,
              lastPayment: processedLoan.lastPayment,
              lastPaymentDate: processedLoan.lastPaymentDate,
              isActive: processedLoan.isActive,
              accruedInterest: processedLoan.accruedInterest,
              formattedAccruedInterest: processedLoan.formattedAccruedInterest,
              outstandingPrincipal: processedLoan.outstandingPrincipal,
              formattedOutstandingPrincipal: processedLoan.formattedOutstandingPrincipal,
              outstandingBalance: processedLoan.outstandingBalance,
              formattedOutstandingBalance: processedLoan.formattedOutstandingBalance,
              totalInterestEarned: processedLoan.totalInterestEarned,
              formattedTotalInterestEarned: processedLoan.formattedTotalInterestEarned,
            };

            loans.push(loan);
            console.log('DEBUG: useBorrowerLoans successfully added loan:', loanId.toString());
          }

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