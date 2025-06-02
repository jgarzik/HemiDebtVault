export interface CreditLine {
  id: string;
  borrower: string;
  lender: string;
  token: string;
  creditLimit: bigint;
  utilisedCredit: bigint;
  minAPR: number;
  maxAPR: number;
  isActive: boolean;
}

export interface Loan {
  id: string;
  lender: string;
  borrower: string;
  token: string;
  principal: bigint;
  repaidPrincipal: bigint;
  forgivenPrincipal: bigint;
  outstandingPrincipal: bigint;
  formattedPrincipal: string;
  formattedRepaidPrincipal: string;
  formattedForgivenPrincipal: string;
  formattedOutstandingPrincipal: string;
  interestRate: number;
  createdAt: number;
  lastPayment: number;
  lastPaymentDate: string;
  isActive: boolean;
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
  type: 'deposit' | 'withdraw' | 'borrow' | 'repay' | 'credit_line';
  amount: bigint;
  token: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  counterparty?: string;
}
