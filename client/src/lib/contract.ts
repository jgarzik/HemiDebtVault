export const DEBT_VAULT_ABI = [
  // Constants
  {
    "inputs": [],
    "name": "MAX_LOANS_PER_USER",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  
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
  
  // Credit line management (now with origination fee)
  {
    "inputs": [
      {"internalType": "address", "name": "borrower", "type": "address"},
      {"internalType": "address", "name": "token", "type": "address"},
      {"internalType": "uint256", "name": "creditLimit", "type": "uint256"},
      {"internalType": "uint256", "name": "minAPR", "type": "uint256"},
      {"internalType": "uint256", "name": "maxAPR", "type": "uint256"},
      {"internalType": "uint256", "name": "originationFee", "type": "uint256"}
    ],
    "name": "updateCreditLine",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // Borrowing functions (now with maxAPR slippage protection)
  {
    "inputs": [
      {"internalType": "address", "name": "lender", "type": "address"},
      {"internalType": "address", "name": "token", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"},
      {"internalType": "uint256", "name": "maxAPR", "type": "uint256"}
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
      {"internalType": "uint256", "name": "loanId", "type": "uint256"}
    ],
    "name": "forgiveInterest",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // ERC721 NFT functions
  {
    "inputs": [{"internalType": "address", "name": "owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "ownerOf",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "from", "type": "address"},
      {"internalType": "address", "name": "to", "type": "address"},
      {"internalType": "uint256", "name": "tokenId", "type": "uint256"}
    ],
    "name": "transferFrom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "from", "type": "address"},
      {"internalType": "address", "name": "to", "type": "address"},
      {"internalType": "uint256", "name": "tokenId", "type": "uint256"}
    ],
    "name": "safeTransferFrom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "from", "type": "address"},
      {"internalType": "address", "name": "to", "type": "address"},
      {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
      {"internalType": "bytes", "name": "data", "type": "bytes"}
    ],
    "name": "safeTransferFrom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "to", "type": "address"},
      {"internalType": "uint256", "name": "tokenId", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "operator", "type": "address"},
      {"internalType": "bool", "name": "approved", "type": "bool"}
    ],
    "name": "setApprovalForAll",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "getApproved",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "address", "name": "operator", "type": "address"}
    ],
    "name": "isApprovedForAll",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  
  // ERC721Enumerable functions
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "index", "type": "uint256"}],
    "name": "tokenByIndex",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "uint256", "name": "index", "type": "uint256"}
    ],
    "name": "tokenOfOwnerByIndex",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  
  // Metadata
  {
    "inputs": [],
    "name": "name",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "tokenURI",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes4", "name": "interfaceId", "type": "bytes4"}],
    "name": "supportsInterface",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
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
      {"internalType": "address", "name": "", "type": "address"},
      {"internalType": "address", "name": "", "type": "address"},
      {"internalType": "address", "name": "", "type": "address"}
    ],
    "name": "creditLines",
    "outputs": [
      {"internalType": "uint256", "name": "creditLimit", "type": "uint256"},
      {"internalType": "uint256", "name": "minAPR", "type": "uint256"},
      {"internalType": "uint256", "name": "maxAPR", "type": "uint256"},
      {"internalType": "uint256", "name": "originationFee", "type": "uint256"}
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
      {"internalType": "address", "name": "", "type": "address"}
    ],
    "name": "totalUserLoans",
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
  {
    "inputs": [
      {"internalType": "address", "name": "", "type": "address"},
      {"internalType": "uint256", "name": "", "type": "uint256"}
    ],
    "name": "loansByOriginalBorrower",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  
  // Events
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "lender", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "token", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "Deposited",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "lender", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "token", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "Withdrawn",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "lender", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "borrower", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "token", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "creditLimit", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "minAPR", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "maxAPR", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "originationFee", "type": "uint256"}
    ],
    "name": "CreditLineUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "loanId", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "borrower", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "lender", "type": "address"},
      {"indexed": false, "internalType": "address", "name": "token", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "principal", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "apr", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "originationFee", "type": "uint256"}
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
      {"indexed": true, "internalType": "uint256", "name": "loanId", "type": "uint256"}
    ],
    "name": "LoanClosed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "loanId", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "PrincipalForgiven",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "loanId", "type": "uint256"}
    ],
    "name": "InterestForgiven",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "borrower", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "lender", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "token", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "newUtilization", "type": "uint256"}
    ],
    "name": "CreditUtilizationUpdated",
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
