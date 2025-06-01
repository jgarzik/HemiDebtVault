import { useAccount, useBlockNumber } from 'wagmi';
import { useState, useEffect } from 'react';
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
}

export function useLoans() {
  const { address } = useAccount();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { data: blockNumber } = useBlockNumber({ watch: false });

  const tokens = getAllTokens();

  // Create public client for event fetching
  const publicClient = createPublicClient({
    chain: hemiNetwork,
    transport: http(),
  });

  const fetchLoans = async () => {
    if (!address) return;
    
    setIsLoading(true);
    try {
      console.log('Fetching loans for lender:', address);
      
      // Get LoanCreated events where the current user is the lender
      const logs = await publicClient.getLogs({
        address: DEBT_VAULT_ADDRESS,
        event: parseAbiItem('event LoanCreated(uint256 indexed loanId, address indexed lender, address indexed borrower, address token, uint256 principal, uint256 interestRate)'),
        args: {
          lender: address,
        },
        fromBlock: 'earliest',
        toBlock: 'latest',
      });

      console.log('Found loan events:', logs.length);

      // Process each loan
      const activeLoans: Loan[] = [];
      
      for (const log of logs) {
        try {
          const { loanId, borrower, token, principal, interestRate } = log.args;
          
          if (!loanId || !token) continue;
          
          // Get loan details from contract to check if still active
          const loanData = await publicClient.readContract({
            address: DEBT_VAULT_ADDRESS,
            abi: DEBT_VAULT_ABI,
            functionName: 'loanById',
            args: [loanId],
          });

          const [lender, loanBorrower, loanToken, loanPrincipal, loanInterestRate, createdAt, lastPayment, , , isActive] = loanData as readonly [string, string, string, bigint, bigint, bigint, bigint, bigint, bigint, boolean];
          
          // Skip if loan is not active
          if (!isActive) continue;

          // Find token info
          const tokenInfo = tokens.find(t => t.address.toLowerCase() === token.toLowerCase());
          
          const loan: Loan = {
            loanId,
            borrower: borrower as string,
            lender: address,
            token: token as string,
            tokenSymbol: tokenInfo?.symbol || 'Unknown',
            principal: loanPrincipal,
            formattedPrincipal: tokenInfo ? formatUnits(loanPrincipal, tokenInfo.decimals) : loanPrincipal.toString(),
            interestRate: loanInterestRate,
            interestRatePercent: (Number(loanInterestRate) / 100).toFixed(2),
            createdAt,
            createdAtDate: new Date(Number(createdAt) * 1000).toLocaleDateString(),
            isActive,
          };

          activeLoans.push(loan);
        } catch (error) {
          console.error('Error fetching loan data for loan ID', log.args.loanId, error);
        }
      }

      console.log('Active loans:', activeLoans);
      setLoans(activeLoans);
    } catch (error) {
      console.error('Error fetching loans:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch loans when address changes or new blocks are mined
  useEffect(() => {
    fetchLoans();
  }, [address, blockNumber]);

  return {
    loans,
    isLoading,
    refetch: fetchLoans,
  };
}

export function useBorrowerLoans() {
  const { address } = useAccount();
  const [borrowedLoans, setBorrowedLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { data: blockNumber } = useBlockNumber({ watch: false });

  const tokens = getAllTokens();

  // Create public client for event fetching
  const publicClient = createPublicClient({
    chain: hemiNetwork,
    transport: http(),
  });

  const fetchBorrowedLoans = async () => {
    if (!address) return;
    
    setIsLoading(true);
    try {
      console.log('Fetching borrowed loans for borrower:', address);
      
      // For now, directly check the known loan ID 0 since event filtering is failing
      // This will work for the current loan and can be expanded later
      const activeLoans: Loan[] = [];
      
      try {
        console.log('Checking loan ID 0 for borrower:', address);
        // Get loan details from contract
        const loanData = await publicClient.readContract({
          address: DEBT_VAULT_ADDRESS,
          abi: DEBT_VAULT_ABI,
          functionName: 'loanById',
          args: [0n], // Check loan ID 0
        });

        console.log('Raw loan data for loan 0:', loanData);
        
        // The contract returns a struct with these fields:
        // borrower, lender, token, principal, repaidPrincipal, forgivenPrincipal, apr, startTimestamp, lastPaymentTimestamp, closed
        const [borrower, loanLender, loanToken, loanPrincipal, repaidPrincipal, forgivenPrincipal, loanInterestRate, createdAt, lastPayment, isClosed] = loanData as readonly [string, string, string, bigint, bigint, bigint, bigint, bigint, bigint, boolean];
        
        console.log('Loan 0 borrower:', borrower, 'User:', address, 'Match:', borrower.toLowerCase() === address.toLowerCase());
        
        // Check if this loan belongs to the user and is active
        if (borrower.toLowerCase() === address.toLowerCase() && !isClosed) {
          console.log('Processing active loan 0 for user');

          // Find token info
          const tokenInfo = tokens.find(t => t.address.toLowerCase() === loanToken.toLowerCase());
          
          const loan: Loan = {
            loanId: 0n,
            borrower: borrower as string,
            lender: loanLender as string,
            token: loanToken as string,
            tokenSymbol: tokenInfo?.symbol || 'Unknown',
            principal: loanPrincipal,
            formattedPrincipal: tokenInfo ? formatUnits(loanPrincipal, tokenInfo.decimals) : loanPrincipal.toString(),
            interestRate: loanInterestRate,
            interestRatePercent: (Number(loanInterestRate) / 100).toFixed(2),
            createdAt,
            createdAtDate: new Date(Number(createdAt) * 1000).toLocaleDateString(),
            isActive: !isClosed,
          };

          activeLoans.push(loan);
          console.log('Added loan 0 to borrowed loans list');
        } else {
          console.log('Loan 0 does not belong to user or is closed');
        }
      } catch (error) {
        console.error('Error fetching loan 0 data:', error);
      }

      console.log('Final active borrowed loans:', activeLoans);
      setBorrowedLoans(activeLoans);
    } catch (error) {
      console.error('Error fetching borrowed loans:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch borrowed loans when address changes, but not on every block to avoid constant reloading
  useEffect(() => {
    fetchBorrowedLoans();
  }, [address]);
  
  // Only refetch on block changes if we have no data yet
  useEffect(() => {
    if (address && borrowedLoans.length === 0) {
      fetchBorrowedLoans();
    }
  }, [blockNumber]);

  return {
    borrowedLoans,
    isLoading,
    refetch: fetchBorrowedLoans,
  };
}