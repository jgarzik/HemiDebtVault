// Test script to query active loans for address 0x8cFafEEc879Ec0Cef5821Aa5340F5D5ab022ACe8
import { createPublicClient, http, parseAbiItem } from 'viem';

// Hemi mainnet configuration
const hemiNetwork = {
  id: 43111,
  name: 'Hemi Network',
  network: 'hemi',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.hemi.network/rpc'],
    },
    public: {
      http: ['https://rpc.hemi.network/rpc'],
    },
  },
  blockExplorers: {
    default: { name: 'Hemi Explorer', url: 'https://explorer.hemi.network' },
  },
};

const DEBT_VAULT_ADDRESS = '0x72F6185DcBb9c8415f01003ACc872f08B44FC292';
const ACTUAL_BORROWER = '0x8cFafEEc879Ec0Cef5821Aa5340F5D5ab022ACe8'; // This holds the DebtNFT

// Basic contract ABI for loan queries
const DEBT_VAULT_ABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
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
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "ownerOf",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
];

async function testLoanQuery() {
  console.log('=== Testing Loan Query on Hemi Mainnet ===');
  console.log('Contract Address:', DEBT_VAULT_ADDRESS);
  console.log('Actual Borrower:', ACTUAL_BORROWER);
  
  // Create public client for Hemi mainnet
  const publicClient = createPublicClient({
    chain: hemiNetwork,
    transport: http(),
  });
  
  try {
    console.log('\n1. Fetching LoanCreated events...');
    
    // First, get ALL LoanCreated events to see what exists
    console.log('Fetching ALL LoanCreated events to see what exists...');
    const allLogs = await publicClient.getLogs({
      address: DEBT_VAULT_ADDRESS,
      event: parseAbiItem('event LoanCreated(uint256 indexed loanId, address indexed lender, address indexed borrower, address token, uint256 principal, uint256 interestRate)'),
      fromBlock: 'earliest',
      toBlock: 'latest',
    });
    
    console.log(`Found ${allLogs.length} total LoanCreated events in the contract`);
    
    if (allLogs.length > 0) {
      console.log('Recent loan events:');
      allLogs.slice(-5).forEach((log, index) => {
        const { loanId, lender, borrower, token, principal } = log.args;
        console.log(`  ${index + 1}. Loan ${loanId?.toString()}: ${borrower} borrowed from ${lender}`);
      });
    }
    
    // Now get LoanCreated events for the actual borrower who holds the DebtNFT
    console.log(`\nFiltering for actual borrower ${ACTUAL_BORROWER}...`);
    const logs = await publicClient.getLogs({
      address: DEBT_VAULT_ADDRESS,
      event: parseAbiItem('event LoanCreated(uint256 indexed loanId, address indexed lender, address indexed borrower, address token, uint256 principal, uint256 interestRate)'),
      args: {
        borrower: ACTUAL_BORROWER,
      },
      fromBlock: 'earliest',
      toBlock: 'latest',
    });
    
    console.log(`Found ${logs.length} LoanCreated events for borrower ${ACTUAL_BORROWER}`);
    
    if (logs.length === 0) {
      console.log('No loans found. This could mean:');
      console.log('- The address has never borrowed');
      console.log('- The events are filtered incorrectly');
      console.log('- The contract address is wrong');
      return;
    }
    
    console.log('\n2. Processing each loan...');
    
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      const { loanId, lender, borrower, token, principal, interestRate } = log.args;
      
      console.log(`\n--- Loan ${i + 1} ---`);
      console.log('Loan ID:', loanId?.toString());
      console.log('Lender:', lender);
      console.log('Borrower:', borrower);
      console.log('Token:', token);
      console.log('Principal:', principal?.toString());
      console.log('Interest Rate:', interestRate?.toString());
      
      if (loanId) {
        try {
          console.log('\n3. Fetching loan details from contract...');
          
          const loanData = await publicClient.readContract({
            address: DEBT_VAULT_ADDRESS,
            abi: DEBT_VAULT_ABI,
            functionName: 'loanById',
            args: [loanId],
          });
          
          console.log('Raw loan data:', loanData);
          
          // Check who actually owns this NFT (the current borrower responsible for repayment)
          const nftOwner = await publicClient.readContract({
            address: DEBT_VAULT_ADDRESS,
            abi: DEBT_VAULT_ABI,
            functionName: 'ownerOf',
            args: [loanId],
          });
          
          console.log('NFT Owner (current borrower):', nftOwner);
          
          const [contractBorrower, contractLender, contractToken, contractPrincipal, repaidPrincipal, forgivenPrincipal, apr, startTimestamp, lastPaymentTimestamp, isClosed] = loanData;
          
          console.log('Parsed loan data:');
          console.log('- Borrower:', contractBorrower);
          console.log('- Lender:', contractLender);
          console.log('- Token:', contractToken);
          console.log('- Principal:', contractPrincipal?.toString());
          console.log('- Repaid Principal:', repaidPrincipal?.toString());
          console.log('- Forgiven Principal:', forgivenPrincipal?.toString());
          console.log('- APR:', apr?.toString());
          console.log('- Start Timestamp:', startTimestamp?.toString());
          console.log('- Last Payment:', lastPaymentTimestamp?.toString());
          console.log('- Is Closed:', isClosed);
          
          if (!isClosed) {
            console.log('✅ This is an ACTIVE loan');
          } else {
            console.log('❌ This loan is CLOSED');
          }
          
        } catch (error) {
          console.error('Error fetching loan details for loan', loanId?.toString(), ':', error);
        }
      }
    }
    
  } catch (error) {
    console.error('Error in test:', error);
  }
}

testLoanQuery();