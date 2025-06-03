export interface CreditLine {
  id: string;
  borrower: string;
  lender: string;
  token: string;
  creditLimit: bigint;
  utilisedCredit: bigint;
  minAPR: number;
  maxAPR: number;
  originationFee: number;
  isActive: boolean;
}

export interface Loan {
  id: string;
  lender: string;
  borrower: string;
  originalBorrower: string;
  token: string;
  principal: bigint;
  repaidPrincipal: bigint;
  forgivenPrincipal: bigint;
  outstandingPrincipal: bigint;
  outstandingBalance: bigint;
  formattedPrincipal: string;
  formattedRepaidPrincipal: string;
  formattedForgivenPrincipal: string;
  formattedOutstandingPrincipal: string;
  formattedOutstandingBalance: string;
  interestRate: number;
  createdAt: number;
  lastPayment: number;
  lastPaymentDate: string;
  isActive: boolean;
  isOwner: boolean;
  isOriginalBorrower: boolean;
}

export interface TokenBalance {
  symbol: string;
  address: string;
  balance: bigint;
  decimals: number;
}

export interface PortfolioStats {
  totalLent: bigint;
  totalBorrowed: bigint;
  activeLoans: number;
  netAPY: number;
  interestEarned: bigint;
  interestPaid: bigint;
}

export interface Relationship {
  address: string;
  trustLevel: 'New' | 'Trusted' | 'Verified';
  creditGiven: bigint;
  creditReceived: bigint;
  totalLoans: number;
  paymentScore: number;
  paymentHistory: boolean[]; // last 30 days
}

export interface Transaction {
  hash: string;
  type: 'deposit' | 'withdraw' | 'borrow' | 'repay' | 'credit_line' | 'forgive_principal' | 'forgive_interest' | 'transfer_nft';
  amount: bigint;
  token: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  counterparty?: string;
  loanId?: string;
  originationFee?: bigint;
}

export interface LoanLimits {
  maxLoansPerUser: number;
  currentLoanCount: number;
  totalLoanCount: number;
  canCreateNewLoan: boolean;
}
