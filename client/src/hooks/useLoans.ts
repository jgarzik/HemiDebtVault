import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { createPublicClient, http, parseAbiItem, formatUnits } from 'viem';
import { DEBT_VAULT_ADDRESS, hemiNetwork } from '@/lib/hemi';
import { DEBT_VAULT_ABI } from '@/lib/contract';
import { getAllTokens } from '@/lib/tokens';
import { QUERY_CACHE_CONFIG } from '@/lib/constants';

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
  const tokens = getAllTokens();

  // Create public client for event fetching
  const publicClient = createPublicClient({
    chain: hemiNetwork,
    transport: http(),
  });

  const fetchLoans = async (): Promise<Loan[]> => {
    if (!address) return [];
    

    
    const loans: Loan[] = [];

    try {
      // Get all LoanCreated events where this user is the lender
      const logs = await publicClient.getLogs({
        address: DEBT_VAULT_ADDRESS,
        event: parseAbiItem('event LoanCreated(uint256 indexed loanId, address indexed borrower, address indexed lender, address token, uint256 amount, uint256 apr)'),
        args: {
          lender: address
        },
        fromBlock: 'earliest',
      });



      // Process each loan
      for (const log of logs) {
        try {
          const { loanId, borrower, lender, token, amount, apr } = log.args;
          
          if (loanId === undefined || loanId === null) {
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
          // borrower, lender, token, principal, repaidPrincipal, forgivenPrincipal, apr, startTimestamp, lastPaymentTimestamp, closed
          const [contractBorrower, contractLender, loanToken, loanPrincipal, repaidPrincipal, forgivenPrincipal, loanInterestRate, createdAt, lastPayment, isClosed] = loanData as readonly [string, string, string, bigint, bigint, bigint, bigint, bigint, bigint, boolean];
          
          // Skip if loan is closed
          if (isClosed) {
            continue;
          }

          // Get token info
          const tokenInfo = tokens.find(t => t.address.toLowerCase() === loanToken.toLowerCase());
          if (!tokenInfo) {
            continue;
          }

          // Get outstanding balance from contract - returns [principal, interest]
          const outstandingBalanceResult = await publicClient.readContract({
            address: DEBT_VAULT_ADDRESS,
            abi: DEBT_VAULT_ABI,
            functionName: 'getOutstandingBalance',
            args: [loanId],
          });
          const [contractOutstandingPrincipal, accruedInterest] = outstandingBalanceResult as readonly [bigint, bigint];
          const outstandingBalance = contractOutstandingPrincipal + accruedInterest;

          // Get total interest earned by fetching LoanRepaid events
          const repaymentEvents = await publicClient.getLogs({
            address: DEBT_VAULT_ADDRESS,
            event: {
              type: 'event',
              name: 'LoanRepaid',
              inputs: [
                { name: 'loanId', type: 'uint256', indexed: true },
                { name: 'amount', type: 'uint256', indexed: false },
                { name: 'interestPaid', type: 'uint256', indexed: false },
                { name: 'principalPaid', type: 'uint256', indexed: false }
              ]
            },
            args: { loanId },
            fromBlock: BigInt(0),
          });

          // Sum up total interest earned from all repayment events
          let totalInterestEarned = BigInt(0);
          console.log(`Found ${repaymentEvents.length} repayment events for loan ${loanId}`);
          for (const event of repaymentEvents) {
            if (event.args && typeof event.args.interestPaid === 'bigint') {
              console.log(`Adding interest paid: ${event.args.interestPaid}`);
              totalInterestEarned += event.args.interestPaid;
            }
          }
          console.log(`Total interest earned for loan ${loanId}: ${totalInterestEarned}`);

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
    enabled: !!address,
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
  const tokens = getAllTokens();

  // Create public client for event fetching
  const publicClient = createPublicClient({
    chain: hemiNetwork,
    transport: http(),
  });

  const fetchBorrowedLoans = async (): Promise<Loan[]> => {
    if (!address) return [];
    

    
    const activeLoans: Loan[] = [];
    
    try {
      // Get LoanCreated events where the current user is the borrower
      const logs = await publicClient.getLogs({
        address: DEBT_VAULT_ADDRESS,
        event: parseAbiItem('event LoanCreated(uint256 indexed loanId, address indexed borrower, address indexed lender, address token, uint256 amount, uint256 apr)'),
        args: {
          borrower: address,
        },
        fromBlock: 'earliest',
      });



      // Process each loan
      for (const log of logs) {
        try {
          const { loanId, borrower, lender, token, amount, apr } = log.args;
          
          if (loanId === undefined || loanId === null) {
            continue;
          }
          
          // Get current loan state from contract
          const loanData = await publicClient.readContract({
            address: DEBT_VAULT_ADDRESS,
            abi: DEBT_VAULT_ABI,
            functionName: 'loanById',
            args: [loanId],
          });


          
          // Parse loan data
          const [contractBorrower, contractLender, loanToken, loanPrincipal, repaidPrincipal, forgivenPrincipal, loanInterestRate, createdAt, lastPayment, isClosed] = loanData as readonly [string, string, string, bigint, bigint, bigint, bigint, bigint, bigint, boolean];
          
          // Skip if loan is closed
          if (isClosed) {
            continue;
          }

          // Get token info
          const tokenInfo = tokens.find(t => t.address.toLowerCase() === loanToken.toLowerCase());
          if (!tokenInfo) {
            continue;
          }

          // Get accurate outstanding balance from contract
          const outstandingBalance = await publicClient.readContract({
            address: DEBT_VAULT_ADDRESS,
            abi: DEBT_VAULT_ABI,
            functionName: 'getOutstandingBalance',
            args: [loanId],
          });

          const [outstandingPrincipal, accruedInterest] = outstandingBalance as [bigint, bigint];

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
            outstandingPrincipal: outstandingPrincipal,
            formattedOutstandingPrincipal: formatUnits(outstandingPrincipal, tokenInfo.decimals),
            outstandingBalance: outstandingPrincipal + accruedInterest,
            formattedOutstandingBalance: formatUnits(outstandingPrincipal + accruedInterest, tokenInfo.decimals),
            interestRate: loanInterestRate,
            interestRatePercent: (Number(loanInterestRate) / 100).toFixed(2),
            createdAt,
            createdAtDate: new Date(Number(createdAt) * 1000).toLocaleDateString(),
            lastPayment,
            lastPaymentDate: lastPayment > 0 ? new Date(Number(lastPayment) * 1000).toLocaleDateString() : 'No payments yet',
            isActive: true,
            accruedInterest,
            formattedAccruedInterest: formatUnits(accruedInterest, tokenInfo.decimals),
          };

          activeLoans.push(loan);

        } catch (error) {
          console.error('Error processing borrowed loan:', error);
        }
      }


      return activeLoans;
    } catch (error) {
      console.error('Error fetching borrowed loans:', error);
      return [];
    }
  };

  const { data: borrowedLoans = [], isLoading, refetch } = useQuery({
    queryKey: ['borrowedLoans', address],
    queryFn: fetchBorrowedLoans,
    enabled: !!address,
    staleTime: QUERY_CACHE_CONFIG.STALE_TIME,
    gcTime: QUERY_CACHE_CONFIG.GC_TIME,
    refetchOnWindowFocus: false,
  });

  return {
    borrowedLoans,
    isLoading,
    refetch,
  };
}