import { formatUnits } from 'viem';
import { findTokenByAddress } from './tokens';
import type { PublicClient } from 'viem';
import { DEBT_VAULT_ADDRESS } from './hemi';
import { DEBT_VAULT_ABI } from './contract';

export interface ProcessedLoanData {
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
  apr: bigint;
  aprPercent: string;
  startTimestamp: bigint;
  lastPaymentTimestamp: bigint;
  closed: boolean;
  originalBorrower?: string;
  isOwner?: boolean;
  isOriginalBorrower?: boolean;
  accruedInterest: bigint;
  formattedAccruedInterest: string;
  totalInterestEarned: bigint;
  formattedTotalInterestEarned: string;
  createdAt: bigint;
  createdAtDate: string;
  lastPayment: bigint;
  lastPaymentDate: string;
  isActive: boolean;
  interestRate: bigint;
  interestRatePercent: string;
}

export function isValidLoanId(loanId: any): loanId is bigint {
  return loanId !== undefined && loanId !== null && typeof loanId === 'bigint';
}

export async function getLoanDataFromContract(
  publicClient: PublicClient,
  loanId: bigint
) {
  const loanData = await publicClient.readContract({
    address: DEBT_VAULT_ADDRESS,
    abi: DEBT_VAULT_ABI,
    functionName: 'loanById',
    args: [loanId],
  });

  return loanData as any;
}

export async function getOutstandingBalance(
  publicClient: PublicClient,
  loanId: bigint
) {
  const outstandingBalanceResult = await publicClient.readContract({
    address: DEBT_VAULT_ADDRESS,
    abi: DEBT_VAULT_ABI,
    functionName: 'getOutstandingBalance',
    args: [loanId],
  });

  return outstandingBalanceResult as readonly [bigint, bigint];
}

export async function getOriginalBorrower(
  publicClient: PublicClient,
  loanId: bigint
): Promise<string> {
  const originalBorrower = await publicClient.readContract({
    address: DEBT_VAULT_ADDRESS,
    abi: DEBT_VAULT_ABI,
    functionName: 'originalBorrower',
    args: [loanId],
  });

  return originalBorrower as string;
}

export function processLoanData(
  loanId: bigint,
  contractData: any,
  outstandingBalanceData: readonly [bigint, bigint],
  originalBorrower?: string,
  currentUserAddress?: string
): ProcessedLoanData | null {
  const [
    contractBorrower,
    contractLender,
    loanToken,
    loanPrincipal,
    repaidPrincipal,
    forgivenPrincipal,
    loanInterestRate,
    createdAtTimestamp,
    lastPaymentTimestamp,
    isClosed
  ] = contractData;

  // Skip if loan is closed
  if (isClosed) {
    return null;
  }

  const tokenInfo = findTokenByAddress(loanToken);
  if (!tokenInfo) {
    return null;
  }

  const [contractOutstandingPrincipal, accruedInterest] = outstandingBalanceData;
  const outstandingBalance = contractOutstandingPrincipal + accruedInterest;
  const createdAt = BigInt(createdAtTimestamp);
  const lastPayment = BigInt(lastPaymentTimestamp);

  return {
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
    outstandingPrincipal: contractOutstandingPrincipal,
    formattedOutstandingPrincipal: formatUnits(contractOutstandingPrincipal, tokenInfo.decimals),
    outstandingBalance,
    formattedOutstandingBalance: formatUnits(outstandingBalance, tokenInfo.decimals),
    apr: loanInterestRate,
    aprPercent: (Number(loanInterestRate) / 100).toFixed(2),
    startTimestamp: createdAt,
    lastPaymentTimestamp: lastPayment,
    closed: isClosed,
    originalBorrower,
    isOwner: currentUserAddress ? contractBorrower.toLowerCase() === currentUserAddress.toLowerCase() : undefined,
    isOriginalBorrower: originalBorrower && currentUserAddress ? 
      originalBorrower.toLowerCase() === currentUserAddress.toLowerCase() : undefined,
    accruedInterest,
    formattedAccruedInterest: formatUnits(accruedInterest, tokenInfo.decimals),
    totalInterestEarned: BigInt(0), // This would need additional calculation
    formattedTotalInterestEarned: '0',
    createdAt,
    createdAtDate: new Date(Number(createdAt) * 1000).toLocaleDateString(),
    lastPayment,
    lastPaymentDate: lastPayment > 0 ? new Date(Number(lastPayment) * 1000).toLocaleDateString() : 'No payments yet',
    isActive: true,
    interestRate: loanInterestRate,
    interestRatePercent: (Number(loanInterestRate) / 100).toFixed(2),
  };
}

export async function processLoanFromEvent(
  publicClient: PublicClient,
  loanId: bigint,
  currentUserAddress?: string
): Promise<ProcessedLoanData | null> {
  try {
    console.log('DEBUG: Processing loan ID:', loanId.toString());

    // Get loan data from contract
    const contractData = await getLoanDataFromContract(publicClient, loanId);
    
    console.log('DEBUG: Loan contract data:', {
      loanId: loanId.toString(),
      borrower: contractData[0],
      lender: contractData[1],
      token: contractData[2],
      principal: contractData[3].toString(),
      closed: contractData[9]
    });

    // Get outstanding balance
    const outstandingBalanceData = await getOutstandingBalance(publicClient, loanId);

    // Get original borrower if needed
    const originalBorrower = await getOriginalBorrower(publicClient, loanId);

    // Process the loan data
    const processedLoan = processLoanData(
      loanId,
      contractData,
      outstandingBalanceData,
      originalBorrower,
      currentUserAddress
    );

    if (processedLoan) {
      console.log('DEBUG: Successfully processed loan:', loanId.toString());
    }

    return processedLoan;
  } catch (error) {
    console.error('Error processing loan:', loanId.toString(), error);
    return null;
  }
}