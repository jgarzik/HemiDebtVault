// Direct test of loan query logic (bypassing server routing issues)
import { createPublicClient, http, parseAbiItem, formatUnits } from 'viem';

const hemiNetwork = {
  id: 43111,
  name: 'Hemi Network',
  network: 'hemi',
  nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
  rpcUrls: { default: { http: ['https://rpc.hemi.network/rpc'] } },
};

const DEBT_VAULT_ADDRESS = '0x72F6185DcBb9c8415f01003ACc872f08B44FC292';
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

const TOKENS = [
  { symbol: 'VCRED', address: '0x71881974e96152643C74A8e0214B877CfB2A0Aa1', decimals: 6 },
  { symbol: 'USDC', address: '0x2bA3a0a35E97e4A8354E83ecCFa1c6a69B0ED5Ab', decimals: 6 },
  { symbol: 'USDT', address: '0x87F8f8C38CdD17a88aC81FdDD95A3e9a4c6Ad0Fd', decimals: 6 },
];

async function getUserLoans(userAddress) {
  console.log('=== Testing Loan API Logic ===');
  console.log('User Address:', userAddress);
  
  const publicClient = createPublicClient({
    chain: hemiNetwork,
    transport: http(),
  });

  try {
    // Get all LoanCreated events
    const logs = await publicClient.getLogs({
      address: DEBT_VAULT_ADDRESS,
      event: parseAbiItem('event LoanCreated(uint256 indexed loanId, address indexed lender, address indexed borrower, address token, uint256 principal, uint256 interestRate)'),
      fromBlock: 'earliest',
      toBlock: 'latest',
    });

    console.log('Found', logs.length, 'total loan events');
    const userLoans = [];

    // Process each loan to check NFT ownership
    for (const log of logs) {
      const { loanId, lender, borrower } = log.args;
      console.log(`\nProcessing loan ${loanId}:`);
      console.log(`  Event lender: ${lender}`);
      console.log(`  Event borrower: ${borrower}`);
      
      if (!loanId) continue;

      try {
        // Get full loan details first
        console.log(`  Getting loan data for loan ${loanId}...`);
        const loanData = await publicClient.readContract({
          address: DEBT_VAULT_ADDRESS,
          abi: DEBT_VAULT_ABI,
          functionName: 'loanById',
          args: [loanId],
        });

        const [contractBorrower, contractLender, token, principal, repaidPrincipal, forgivenPrincipal, apr, startTimestamp, lastPaymentTimestamp, isClosed] = loanData;

        console.log(`  → Contract borrower field: ${contractBorrower}`);
        console.log(`  → Contract lender field: ${contractLender}`);
        console.log(`  → User address: ${userAddress}`);
        console.log(`  → Borrower match: ${contractBorrower.toLowerCase() === userAddress.toLowerCase()}`);
        console.log(`  → Loan closed: ${isClosed}`);

        // Check if this loan belongs to the user (they are the borrower)
        if (contractBorrower.toLowerCase() !== userAddress.toLowerCase()) {
          console.log(`  → Skipped (user is not the borrower)`);
          continue;
        }

        // Skip closed loans
        if (isClosed) {
          console.log(`  → Skipped (loan is closed)`);
          continue;
        }

        console.log(`  → Processing active loan for user`);

        // Find token info
        const tokenInfo = TOKENS.find(t => t.address.toLowerCase() === token.toLowerCase());
        
        const loanObj = {
          loanId: loanId.toString(),
          borrower: contractBorrower,
          lender: contractLender,
          token,
          tokenSymbol: tokenInfo?.symbol || 'Unknown',
          principal: principal.toString(),
          formattedPrincipal: tokenInfo ? formatUnits(principal, tokenInfo.decimals) : principal.toString(),
          apr: apr.toString(),
          aprPercent: (Number(apr) / 100).toFixed(2),
          createdAt: startTimestamp.toString(),
          createdAtDate: new Date(Number(startTimestamp) * 1000).toLocaleDateString(),
          isActive: !isClosed,
        };

        userLoans.push(loanObj);
        console.log(`  → Added to user loans list`);

      } catch (nftError) {
        console.log(`Loan ${loanId}: NFT error:`, nftError.shortMessage || nftError.message);
        console.log(`  Full error:`, nftError);
      }
    }

    const result = {
      address: userAddress,
      loans: userLoans,
      count: userLoans.length
    };

    console.log('\n=== RESULT ===');
    console.log(JSON.stringify(result, null, 2));
    
    return result;

  } catch (error) {
    console.error('Error fetching loans:', error);
    throw error;
  }
}

// Test with your address
getUserLoans('0x8cFafEEc879Ec0Cef5821Aa5340F5D5ab022ACe8').catch(console.error);