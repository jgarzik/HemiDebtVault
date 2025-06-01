import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { createPublicClient, http, parseAbiItem, formatUnits } from 'viem';
import { DEBT_VAULT_ADDRESS, hemiNetwork } from '@/lib/hemi';
import { DEBT_VAULT_ABI } from '@/lib/contract';
import { getAllTokens } from '@/lib/tokens';

interface Loan {
  loanId: bigint;
  borrower: string;
  lender: string;
  token: string;
  tokenSymbol: string;
  principal: bigint;
  formattedPrincipal: string;
  interestRate: bigint;
  interestRatePercent: string;
  createdAt: bigint;
  createdAtDate: string;
  isActive: boolean;
  accruedInterest: bigint;
  formattedAccruedInterest: string;
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
    
    console.log('Fetching loans for lender:', address);
    
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

      console.log(`Found ${logs.length} loan events for lender ${address}`);

      // Process each loan
      for (const log of logs) {
        try {
          const { loanId, borrower, lender, token, amount, apr } = log.args;
          
          console.log(`Processing loan event - ID: ${loanId}, borrower: ${borrower}, lender: ${lender}`);
          
          if (loanId === undefined || loanId === null) {
            console.log('Skipping - no loanId');
            continue;
          }
          
          // Get loan details from contract to check if still active
          const loanData = await publicClient.readContract({
            address: DEBT_VAULT_ADDRESS,
            abi: DEBT_VAULT_ABI,
            functionName: 'loanById',
            args: [loanId],
          });

          console.log('Raw loan data for loan', loanId, ':', loanData);
          
          // The contract returns a struct with these fields:
          // borrower, lender, token, principal, repaidPrincipal, forgivenPrincipal, apr, startTimestamp, lastPaymentTimestamp, closed
          const [contractBorrower, contractLender, loanToken, loanPrincipal, repaidPrincipal, forgivenPrincipal, loanInterestRate, createdAt, lastPayment, isClosed] = loanData as readonly [string, string, string, bigint, bigint, bigint, bigint, bigint, bigint, boolean];
          
          // Skip if loan is closed
          if (isClosed) {
            console.log('Skipping closed loan', loanId);
            continue;
          }

          // Get token info
          const tokenInfo = tokens.find(t => t.address.toLowerCase() === loanToken.toLowerCase());
          if (!tokenInfo) {
            console.log('Skipping - token not found:', loanToken);
            continue;
          }

          // Calculate accrued interest
          const currentTime = BigInt(Math.floor(Date.now() / 1000));
          const timeElapsed = currentTime - createdAt;
          const accruedInterest = (loanPrincipal * loanInterestRate * timeElapsed) / (BigInt(100) * BigInt(365 * 24 * 3600));

          const loan: Loan = {
            loanId,
            borrower: contractBorrower,
            lender: contractLender,
            token: loanToken,
            tokenSymbol: tokenInfo.symbol,
            principal: loanPrincipal,
            formattedPrincipal: formatUnits(loanPrincipal, tokenInfo.decimals),
            interestRate: loanInterestRate,
            interestRatePercent: (Number(loanInterestRate) / 100).toFixed(2),
            createdAt,
            createdAtDate: new Date(Number(createdAt) * 1000).toLocaleDateString(),
            isActive: true,
            accruedInterest,
            formattedAccruedInterest: formatUnits(accruedInterest, tokenInfo.decimals),
          };

          loans.push(loan);
          console.log('Added loan:', loan);
        } catch (error) {
          console.error('Error processing loan:', error);
        }
      }

      console.log('Final loans array:', loans);
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
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
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
    
    console.log('Fetching borrowed loans for borrower:', address);
    
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

      console.log(`Found ${logs.length} loan events for borrower ${address}`);

      // Process each loan
      for (const log of logs) {
        try {
          const { loanId, borrower, lender, token, amount, apr } = log.args;
          
          console.log(`Processing borrowed loan event - ID: ${loanId}, borrower: ${borrower}, lender: ${lender}`);
          
          if (loanId === undefined || loanId === null) {
            console.log('Skipping - no loanId');
            continue;
          }
          
          // Get current loan state from contract
          const loanData = await publicClient.readContract({
            address: DEBT_VAULT_ADDRESS,
            abi: DEBT_VAULT_ABI,
            functionName: 'loanById',
            args: [loanId],
          });

          console.log('Raw borrowed loan data for loan', loanId, ':', loanData);
          
          // Parse loan data
          const [contractBorrower, contractLender, loanToken, loanPrincipal, repaidPrincipal, forgivenPrincipal, loanInterestRate, createdAt, lastPayment, isClosed] = loanData as readonly [string, string, string, bigint, bigint, bigint, bigint, bigint, bigint, boolean];
          
          // Skip if loan is closed
          if (isClosed) {
            console.log('Skipping closed borrowed loan', loanId);
            continue;
          }

          // Get token info
          const tokenInfo = tokens.find(t => t.address.toLowerCase() === loanToken.toLowerCase());
          if (!tokenInfo) {
            console.log('Skipping borrowed loan - token not found:', loanToken);
            continue;
          }

          // Calculate accrued interest for borrower view
          const currentTime = BigInt(Math.floor(Date.now() / 1000));
          const timeElapsed = currentTime - createdAt;
          const accruedInterest = (loanPrincipal * loanInterestRate * timeElapsed) / (BigInt(100) * BigInt(365 * 24 * 3600));

          const loan: Loan = {
            loanId,
            borrower: contractBorrower,
            lender: contractLender,
            token: loanToken,
            tokenSymbol: tokenInfo.symbol,
            principal: loanPrincipal,
            formattedPrincipal: formatUnits(loanPrincipal, tokenInfo.decimals),
            interestRate: loanInterestRate,
            interestRatePercent: (Number(loanInterestRate) / 100).toFixed(2),
            createdAt,
            createdAtDate: new Date(Number(createdAt) * 1000).toLocaleDateString(),
            isActive: true,
            accruedInterest,
            formattedAccruedInterest: formatUnits(accruedInterest, tokenInfo.decimals),
          };

          activeLoans.push(loan);
          console.log('Added borrowed loan:', loan);
        } catch (error) {
          console.error('Error processing borrowed loan:', error);
        }
      }

      console.log('Final borrowed loans array:', activeLoans);
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
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    borrowedLoans,
    isLoading,
    refetch,
  };
}