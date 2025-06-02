export const DEBT_VAULT_ABI = [
  // Deposit/Withdraw functions
  {
    "inputs": [
      {"internalType": "address", "name": "token", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "deposit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "token", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // Credit line management
  {
    "inputs": [
      {"internalType": "address", "name": "borrower", "type": "address"},
      {"internalType": "address", "name": "token", "type": "address"},
      {"internalType": "uint256", "name": "creditLimit", "type": "uint256"},
      {"internalType": "uint256", "name": "minAPR", "type": "uint256"},
      {"internalType": "uint256", "name": "maxAPR", "type": "uint256"}
    ],
    "name": "updateCreditLine",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // Borrowing functions
  {
    "inputs": [
      {"internalType": "address", "name": "lender", "type": "address"},
      {"internalType": "address", "name": "token", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "borrow",
    "outputs": [{"internalType": "uint256", "name": "loanId", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // Repayment functions
  {
    "inputs": [
      {"internalType": "uint256", "name": "loanId", "type": "uint256"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "repay",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // NFT functions
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "ownerOf",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  
  // Forgiveness functions
  {
    "inputs": [
      {"internalType": "uint256", "name": "loanId", "type": "uint256"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "forgivePrincipal",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "loanId", "type": "uint256"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "forgiveInterest",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // View functions - Public mappings
  {
    "inputs": [
      {"internalType": "address", "name": "lender", "type": "address"},
      {"internalType": "address", "name": "token", "type": "address"}
    ],
    "name": "lenderDeposits",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "user", "type": "address"},
      {"internalType": "address", "name": "token", "type": "address"}
    ],
    "name": "deposits",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "", "type": "address"},
      {"internalType": "address", "name": "", "type": "address"},
      {"internalType": "address", "name": "", "type": "address"}
    ],
    "name": "creditLines",
    "outputs": [
      {"internalType": "uint256", "name": "creditLimit", "type": "uint256"},
      {"internalType": "uint256", "name": "minAPR", "type": "uint256"},
      {"internalType": "uint256", "name": "maxAPR", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "", "type": "uint256"}
    ],
    "name": "loanById",
    "outputs": [
      {"internalType": "address", "name": "borrower", "type": "address"},
      {"internalType": "address", "name": "lender", "type": "address"},
      {"internalType": "address", "name": "token", "type": "address"},
      {"internalType": "uint256", "name": "principal", "type": "uint256"},
      {"internalType": "uint256", "name": "repaidPrincipal", "type": "uint256"},
      {"internalType": "uint256", "name": "forgivenPrincipal", "type": "uint256"},
      {"internalType": "uint256", "name": "apr", "type": "uint256"},
      {"internalType": "uint64", "name": "startTimestamp", "type": "uint64"},
      {"internalType": "uint64", "name": "lastPaymentTimestamp", "type": "uint64"},
      {"internalType": "bool", "name": "closed", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "loanId", "type": "uint256"}
    ],
    "name": "getOutstandingBalance",
    "outputs": [
      {"internalType": "uint256", "name": "principal", "type": "uint256"},
      {"internalType": "uint256", "name": "interest", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "borrower", "type": "address"},
      {"internalType": "address", "name": "lender", "type": "address"},
      {"internalType": "address", "name": "token", "type": "address"}
    ],
    "name": "getAvailableCredit",
    "outputs": [
      {"internalType": "uint256", "name": "availableCredit", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "", "type": "address"}
    ],
    "name": "userLoanCount",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "", "type": "uint256"}
    ],
    "name": "originalBorrower",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  
  // Events
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "loanId", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "lender", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "borrower", "type": "address"},
      {"indexed": false, "internalType": "address", "name": "token", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "interestRate", "type": "uint256"}
    ],
    "name": "LoanCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "loanId", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "interestPaid", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "principalPaid", "type": "uint256"}
    ],
    "name": "LoanRepaid",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "lender", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "borrower", "type": "address"},
      {"indexed": false, "internalType": "address", "name": "token", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "creditLimit", "type": "uint256"}
    ],
    "name": "CreditLineUpdated",
    "type": "event"
  }
] as const;

// Common token addresses on Hemi network
export const TOKEN_ADDRESSES = {
  USDC: '0x', // Add actual USDC address on Hemi
  USDT: '0x', // Add actual USDT address on Hemi
  DAI: '0x',  // Add actual DAI address on Hemi
  WETH: '0x', // Add actual WETH address on Hemi
} as const;

export const TOKEN_DECIMALS = {
  USDC: 6,
  USDT: 6,
  DAI: 18,
  WETH: 18,
} as const;
