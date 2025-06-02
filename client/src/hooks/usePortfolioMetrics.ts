import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { createPublicClient, http, parseAbiItem, formatUnits } from 'viem';
import { DEBT_VAULT_ADDRESS, hemiNetwork } from '@/lib/hemi';
import { DEBT_VAULT_ABI } from '@/lib/contract';
import { getAllTokens } from '@/lib/tokens';
import { QUERY_CACHE_CONFIG } from '@/lib/constants';
import { useLoans, useBorrowerLoans } from './useLoans';
import { useCreditLines } from './useCreditLines';

interface PortfolioMetrics {
  totalLent: string;
  totalBorrowed: string;
  interestEarned: string;
  interestPaid: string;
  activeLoans: number;
  avgUtilization: string;
  relationshipCount: number;
  avgLoanDuration: number;
  annualizedReturn: string;
  riskScore: 'Low' | 'Medium' | 'High';
  monthlyYield: string;
  paymentHealth: 'New' | 'Good' | 'Warning' | 'Poor';
  tokenBreakdown: {
    lent: { [token: string]: string };
    borrowed: { [token: string]: string };
    interestEarned: { [token: string]: string };
    interestPaid: { [token: string]: string };
  };
}

interface Relationship {
  address: string;
  totalLoans: number;
  totalVolume: string;
  avgAPR: string;
  trustLevel: 'New' | 'Trusted' | 'Verified';
}

export function usePortfolioMetrics() {
  const { address } = useAccount();
  const { loans: lenderLoans } = useLoans();
  const { borrowedLoans } = useBorrowerLoans();
  const { creditLines } = useCreditLines();
  const tokens = getAllTokens();

  const publicClient = createPublicClient({
    chain: hemiNetwork,
    transport: http(),
  });

  const calculateMetrics = async (): Promise<PortfolioMetrics> => {
    if (!address) {
      return {
        totalLent: '0',
        totalBorrowed: '0',
        interestEarned: '0',
        interestPaid: '0',
        activeLoans: 0,
        avgUtilization: '0',
        relationshipCount: 0,
        avgLoanDuration: 0,
        annualizedReturn: '0',
        riskScore: 'Low',
        monthlyYield: '0',
        paymentHealth: 'New',
        tokenBreakdown: {
          lent: {},
          borrowed: {},
          interestEarned: {},
          interestPaid: {},
        },
      };
    }

    // Track totals by token - NEVER mix different currencies
    const tokenTotals = {
      lent: {} as { [symbol: string]: number },
      borrowed: {} as { [symbol: string]: number },
      interestEarned: {} as { [symbol: string]: number },
      interestPaid: {} as { [symbol: string]: number },
    };

    let totalLoanDuration = 0;

    // Process lender loans - keep per token
    for (const loan of lenderLoans) {
      const tokenInfo = tokens.find(t => t.address.toLowerCase() === loan.token.toLowerCase());
      if (!tokenInfo) continue;

      const principalValue = parseFloat(loan.formattedPrincipal);
      const interestValue = parseFloat(loan.formattedAccruedInterest);
      
      // Accumulate by token symbol
      tokenTotals.lent[tokenInfo.symbol] = (tokenTotals.lent[tokenInfo.symbol] || 0) + principalValue;
      tokenTotals.interestEarned[tokenInfo.symbol] = (tokenTotals.interestEarned[tokenInfo.symbol] || 0) + interestValue;

      // Calculate loan duration
      const createdDate = new Date(Number(loan.createdAt) * 1000);
      const daysSinceCreation = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      totalLoanDuration += daysSinceCreation;
    }

    // Process borrower loans - keep per token
    for (const loan of borrowedLoans) {
      const tokenInfo = tokens.find(t => t.address.toLowerCase() === loan.token.toLowerCase());
      if (!tokenInfo) continue;

      const principalValue = parseFloat(loan.formattedPrincipal);
      const interestValue = parseFloat(loan.formattedAccruedInterest);
      
      // Accumulate by token symbol
      tokenTotals.borrowed[tokenInfo.symbol] = (tokenTotals.borrowed[tokenInfo.symbol] || 0) + principalValue;
      tokenTotals.interestPaid[tokenInfo.symbol] = (tokenTotals.interestPaid[tokenInfo.symbol] || 0) + interestValue;
    }

    // Calculate utilization
    let totalCreditLimit = 0;
    let totalUtilized = 0;

    for (const creditLine of creditLines) {
      const tokenInfo = tokens.find(t => t.address.toLowerCase() === creditLine.token.toLowerCase());
      if (!tokenInfo) continue;

      const creditLimitValue = parseFloat(creditLine.formattedCreditLimit);
      totalCreditLimit += creditLimitValue;

      // Get current utilization for this credit line
      try {
        const availableCredit = await publicClient.readContract({
          address: DEBT_VAULT_ADDRESS,
          abi: DEBT_VAULT_ABI,
          functionName: 'getAvailableCredit',
          args: [address as `0x${string}`, creditLine.borrower as `0x${string}`, creditLine.token as `0x${string}`],
        }) as bigint;

        const utilizationValue = creditLimitValue - parseFloat(formatUnits(availableCredit, tokenInfo.decimals));
        totalUtilized += utilizationValue;
      } catch (error) {
        console.error('Error calculating utilization:', error);
      }
    }

    const avgUtilization = totalCreditLimit > 0 ? (totalUtilized / totalCreditLimit) * 100 : 0;

    // Calculate relationships
    const relationships = new Set<string>();
    lenderLoans.forEach(loan => relationships.add(loan.borrower.toLowerCase()));
    borrowedLoans.forEach(loan => relationships.add(loan.lender.toLowerCase()));

    // Create formatted token breakdown
    const tokenBreakdown = {
      lent: {} as { [token: string]: string },
      borrowed: {} as { [token: string]: string },
      interestEarned: {} as { [token: string]: string },
      interestPaid: {} as { [token: string]: string },
    };

    // Format all token amounts
    Object.keys(tokenTotals.lent).forEach(symbol => {
      tokenBreakdown.lent[symbol] = tokenTotals.lent[symbol].toFixed(6);
    });
    Object.keys(tokenTotals.borrowed).forEach(symbol => {
      tokenBreakdown.borrowed[symbol] = tokenTotals.borrowed[symbol].toFixed(6);
    });
    Object.keys(tokenTotals.interestEarned).forEach(symbol => {
      tokenBreakdown.interestEarned[symbol] = tokenTotals.interestEarned[symbol].toFixed(6);
    });
    Object.keys(tokenTotals.interestPaid).forEach(symbol => {
      tokenBreakdown.interestPaid[symbol] = tokenTotals.interestPaid[symbol].toFixed(6);
    });

    // Find primary token for display (most lent amount)
    let primaryLentToken = 'VCRED';
    let maxLentAmount = 0;
    Object.keys(tokenTotals.lent).forEach(symbol => {
      if (tokenTotals.lent[symbol] > maxLentAmount) {
        maxLentAmount = tokenTotals.lent[symbol];
        primaryLentToken = symbol;
      }
    });

    // Find primary borrowed token
    let primaryBorrowedToken = 'VCRED';
    let maxBorrowedAmount = 0;
    Object.keys(tokenTotals.borrowed).forEach(symbol => {
      if (tokenTotals.borrowed[symbol] > maxBorrowedAmount) {
        maxBorrowedAmount = tokenTotals.borrowed[symbol];
        primaryBorrowedToken = symbol;
      }
    });

    // Calculate metrics using primary tokens (no mixing currencies)
    const totalActiveLoans = lenderLoans.length + borrowedLoans.length;
    const avgDuration = totalActiveLoans > 0 ? totalLoanDuration / lenderLoans.length : 0;
    
    let annualizedReturn = 0;
    const primaryLentAmount = tokenTotals.lent[primaryLentToken] || 0;
    const primaryInterestEarned = tokenTotals.interestEarned[primaryLentToken] || 0;
    if (primaryLentAmount > 0 && avgDuration > 0) {
      const dailyReturn = primaryInterestEarned / primaryLentAmount / avgDuration;
      annualizedReturn = dailyReturn * 365 * 100;
    }

    // Calculate payment health based on loan performance
    let paymentHealth: 'New' | 'Good' | 'Warning' | 'Poor' = 'New';
    if (totalActiveLoans > 0) {
      if (totalActiveLoans >= 5) {
        paymentHealth = 'Good';
      } else if (totalActiveLoans >= 2) {
        paymentHealth = 'Warning';
      }
    }

    // Calculate risk score based on diversification and loan sizes
    let riskScore: 'Low' | 'Medium' | 'High' = 'Low';
    if (relationships.size < 3 && totalActiveLoans > 0) {
      riskScore = 'High';
    } else if (relationships.size < 5) {
      riskScore = 'Medium';
    }

    // Calculate monthly yield using primary token
    const monthlyYield = primaryLentAmount > 0 ? (primaryInterestEarned / primaryLentAmount) * 100 : 0;

    return {
      totalLent: `${maxLentAmount.toFixed(6)} ${primaryLentToken}`,
      totalBorrowed: `${maxBorrowedAmount.toFixed(6)} ${primaryBorrowedToken}`,
      interestEarned: `${primaryInterestEarned.toFixed(6)} ${primaryLentToken}`,
      interestPaid: `${(tokenTotals.interestPaid[primaryBorrowedToken] || 0).toFixed(6)} ${primaryBorrowedToken}`,
      activeLoans: totalActiveLoans,
      avgUtilization: avgUtilization.toFixed(1),
      relationshipCount: relationships.size,
      avgLoanDuration: Math.round(avgDuration),
      annualizedReturn: annualizedReturn.toFixed(2),
      riskScore,
      monthlyYield: monthlyYield.toFixed(2),
      paymentHealth,
      tokenBreakdown,
    };
  };

  const { data: metrics, isLoading, refetch } = useQuery({
    queryKey: ['portfolioMetrics', address, lenderLoans.length, borrowedLoans.length, creditLines.length],
    queryFn: calculateMetrics,
    enabled: !!address,
    staleTime: QUERY_CACHE_CONFIG.STALE_TIME,
    gcTime: QUERY_CACHE_CONFIG.GC_TIME,
    refetchOnWindowFocus: false,
  });

  // Calculate relationships
  const calculateRelationships = (): Relationship[] => {
    const relationshipMap = new Map<string, {
      totalLoans: number;
      totalVolume: number;
      totalAPR: number;
      loanCount: number;
    }>();

    // Process lending relationships
    lenderLoans.forEach(loan => {
      const key = loan.borrower.toLowerCase();
      const existing = relationshipMap.get(key) || { totalLoans: 0, totalVolume: 0, totalAPR: 0, loanCount: 0 };
      
      existing.totalLoans += 1;
      existing.totalVolume += parseFloat(loan.formattedPrincipal);
      existing.totalAPR += parseFloat(loan.interestRatePercent);
      existing.loanCount += 1;
      
      relationshipMap.set(key, existing);
    });

    // Process borrowing relationships
    borrowedLoans.forEach(loan => {
      const key = loan.lender.toLowerCase();
      const existing = relationshipMap.get(key) || { totalLoans: 0, totalVolume: 0, totalAPR: 0, loanCount: 0 };
      
      existing.totalLoans += 1;
      existing.totalVolume += parseFloat(loan.formattedPrincipal);
      existing.totalAPR += parseFloat(loan.interestRatePercent);
      existing.loanCount += 1;
      
      relationshipMap.set(key, existing);
    });

    return Array.from(relationshipMap.entries()).map(([address, data]) => ({
      address,
      totalLoans: data.totalLoans,
      totalVolume: data.totalVolume.toFixed(6),
      avgAPR: data.loanCount > 0 ? (data.totalAPR / data.loanCount).toFixed(2) : '0.00',
      trustLevel: data.totalLoans >= 5 ? 'Verified' : data.totalLoans >= 2 ? 'Trusted' : 'New',
    }));
  };

  return {
    metrics: metrics || {
      totalLent: '0',
      totalBorrowed: '0',
      interestEarned: '0',
      interestPaid: '0',
      activeLoans: 0,
      avgUtilization: '0',
      relationshipCount: 0,
      avgLoanDuration: 0,
      annualizedReturn: '0',
      riskScore: 'Low' as const,
      monthlyYield: '0',
      paymentHealth: 'New' as const,
    },
    relationships: calculateRelationships(),
    isLoading,
    refetch,
  };
}